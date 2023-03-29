import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { Project } from "./.gen/providers/google/project";
import { DataGoogleBillingAccount } from "./.gen/providers/google/data-google-billing-account";
import { AppEngineApplication } from "./.gen/providers/google/app-engine-application";


import { CloudFunctionConstruct } from "./components/cloud-function-construct";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./components/cloud-function-deployment-construct";
import { CloudSchedulerConstruct } from "./components/cloud-scheduler-construct";
import { DataStoreConstruct } from "./components/datastore-construct";
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

    const cloudFunctionDeploymentConstruct = new CloudFunctionDeploymentConstruct(this, "cloud-function-deployment", {
      projectId: project.projectId,
      region: process.env.REGION!,
    });
    const cloudFunctionConstruct = new CloudFunctionConstruct(this, "cloud-function");
    await cloudFunctionConstruct.build({
      functionName: "google-calendar-poller",
      entryPoint: "http_handler",
      environmentVariables: {
        "ICALURL": process.env.ICALURL!,
      },
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
    });

    // This a hack to enable datastore API for the project
    // https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/datastore_index
    const dummyAppEngineApplication = new AppEngineApplication(this, "app-engine-application", {
      locationId: process.env.REGION!,
      project: project.projectId,     
      databaseType: "CLOUD_DATASTORE_COMPATIBILITY",
    });

    new DataStoreConstruct(this, "calendar-event-data-store", {
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

