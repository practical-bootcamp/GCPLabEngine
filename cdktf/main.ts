import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { Project } from "./.gen/providers/google/project";
import { DataGoogleBillingAccount } from "./.gen/providers/google/data-google-billing-account";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./constructs/cloud-function-deployment-construct";
import { CalendarTriggerPattern } from "./patterns/calendar-trigger";
import { ClassGrader } from "./business-logics/class-grader";
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

    //For the first deployment, it takes a while for API to be enabled.
    // await new Promise(r => setTimeout(r, 30000));

    const calendarTriggerPattern = await CalendarTriggerPattern.create(this, "calendar-trigger", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      suffix: ""
    });
    await ClassGrader.create(this, "class-grader", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      calendarTriggerPattern: calendarTriggerPattern,
    });

    const cloudFunctionConstruct = await CloudFunctionConstruct.create(this, "cloud-function", {
      functionName: "registration",
      runtime: "nodejs16",
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      makePublic: true,
    });
    
    new TerraformOutput(this, "registration-url", {
      value: cloudFunctionConstruct.cloudFunction.serviceConfig.uri,
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

