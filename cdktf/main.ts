import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { Project } from "./.gen/providers/google/project";
import { DataGoogleBillingAccount } from "./.gen/providers/google/data-google-billing-account";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./constructs/cloud-function-deployment-construct";

import { CalendarTriggerPattern } from "./patterns/calendar-trigger";
import { CloudFunctionConstruct } from "./constructs/cloud-function-construct";
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
      project: project.projectId,
      region: process.env.REGION!,
    });

    const calendarTriggerPattern = await CalendarTriggerPattern.createCalendarTriggerPattern(this, "calendar-trigger", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      suffix: ""
    });

    await CloudFunctionConstruct.createCloudFunctionConstruct(this, "cloud-function", {
      functionName: "class-grader",
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      eventTrigger:
      {
        eventType: "google.cloud.pubsub.topic.v1.messagePublished",
        pubsubTopic: calendarTriggerPattern.startEventTopic.id,       
      },
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

