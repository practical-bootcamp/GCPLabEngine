import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { Project } from "./.gen/providers/google/project";
import { DataGoogleBillingAccount } from "./.gen/providers/google/data-google-billing-account";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./constructs/cloud-function-deployment-construct";
import { CalendarTriggerPattern } from "./patterns/calendar-trigger";
import { PubSubCloudFunctionSubscriberPattern } from "./patterns/pubsub-cloudfunction-subscriber";
import { CloudFunctionConstruct } from "./constructs/cloud-function-construct";
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
      project: project.projectId,
      region: process.env.REGION!,
    });

    const calendarTriggerPattern = await CalendarTriggerPattern.create(this, "calendar-trigger", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      suffix: ""
    });

    await PubSubCloudFunctionSubscriberPattern.create(this, "class-grader-pubsub-cloud-function-subscriber", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      functionName: "class-grader",
      eventTopic: calendarTriggerPattern.eventTopic,
      filter: `attributes.type="START"`,
    });

    await CloudFunctionConstruct.create(this, "grader-cloud-function", {
      functionName: "grader",
      entryPoint: "HelloWorld.Function",
      runtime: "dotnet6",
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
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

