import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { CloudFunctionConstruct } from "./components/cloud-function-construct";

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

    const cloudFunctionConstruct = new CloudFunctionConstruct(this, "cloud-function");
    await cloudFunctionConstruct.build({
      projectId: projectId,
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

