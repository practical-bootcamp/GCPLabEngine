import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { CloudFunctionConstruct } from "./components/cloud-function-construct";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./components/cloud-function-deployment-construct";
import { CloudSchedulerConstruct } from "./components/cloud-scheduler-construct";
dotenv.config();

class GcpLabEngineStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  async buildGcpLabEngineStack() {
    const projectId = "gcplabengine";
    new GoogleProvider(this, "google", {
      project: projectId,
      billingProject: projectId,
      userProjectOverride: true,
    });

    const cloudFunctionDeploymentConstruct = new CloudFunctionDeploymentConstruct(this, "cloud-function-deployment", {
      projectId: projectId,
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

