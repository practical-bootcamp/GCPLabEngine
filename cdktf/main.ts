import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { Project } from "./.gen/providers/google/project";
import { DataGoogleBillingAccount } from "./.gen/providers/google/data-google-billing-account";
import { AppEngineApplication } from "./.gen/providers/google/app-engine-application";


import { CloudFunctionConstruct } from "./constructs/cloud-function-construct";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./constructs/cloud-function-deployment-construct";
import { CloudSchedulerConstruct } from "./constructs/cloud-scheduler-construct";
import { DataStoreConstruct } from "./constructs/datastore-construct";
// import { ProjectService } from "./.gen/providers/google/project-service";
dotenv.config();

class GcpLabEngineStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  async buildGcpLabEngineStack() {
    const projectId = process.env.PROJECTID!;
    new GoogleProvider(this, "google", {
      // userProjectOverride: true,
    });

    const billingAccount = new DataGoogleBillingAccount(this, "billing-account", {
      billingAccount: process.env.BillING_ACCOUNT!,
    });

    const project = new Project(this, "project", {
      projectId: projectId,
      name: projectId,
      billingAccount: billingAccount.id,
      skipDelete: false
    });

    // This is a hack to enable datastore API for the project
    // https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/datastore_index
    const dummyAppEngineApplication = new AppEngineApplication(this, "app-engine-application", {
      locationId: process.env.REGION!,
      project: project.projectId,
      databaseType: "CLOUD_DATASTORE_COMPATIBILITY",
    });

    const cloudFunctionDeploymentConstruct = new CloudFunctionDeploymentConstruct(this, "cloud-function-deployment", {
      projectId: project.projectId,
      region: process.env.REGION!,
    });
    const cloudFunctionConstruct = new CloudFunctionConstruct(this, "cloud-function", {
      functionName: "google-calendar-poller",
      entryPoint: "http_handler",
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
    });

    const calendarDataStore = new DataStoreConstruct(this, "calendar-event-data-store", {
      cloudFunctionConstruct: cloudFunctionConstruct,
      kind: "calendar-event",
      properties: [
        {
          name: "start",
          direction: "ASCENDING",
        },
        {
          name: "end",
          direction: "ASCENDING",
        }
      ],
      appEngineApplication: dummyAppEngineApplication,
    });

    await cloudFunctionConstruct.createCloudFunction({
      "ICALURL": process.env.ICALURL!,
      "calendarDataStore": calendarDataStore.datastoreIndex.id,
    });

    new CloudSchedulerConstruct(this, "cloud-scheduler", {
      name: "google-calendar-poller-scheduler",
      cronExpression: "*/15 * * * *",
      cloudFunctionConstruct: cloudFunctionConstruct,
    });

  }
}


async function buildStack(scope: Construct, id: string) {
  const stack = new GcpLabEngineStack(scope, id);
  await stack.buildGcpLabEngineStack();
}

async function createApp(): Promise<App> {
  const app = new App();
  await buildStack(app, "cdktf");
  return app;
}

createApp().then((app) => app.synth());

