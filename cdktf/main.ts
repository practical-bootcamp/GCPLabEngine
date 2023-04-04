import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import { GoogleProvider } from "./.gen/providers/google/provider/index";
import { Project } from "./.gen/providers/google/project";
import { DataGoogleBillingAccount } from "./.gen/providers/google/data-google-billing-account";
import * as dotenv from 'dotenv';
import { CloudFunctionDeploymentConstruct } from "./constructs/cloud-function-deployment-construct";
import { CalendarTriggerPattern } from "./patterns/calendar-trigger";
import { ClassGrader } from "./business-logics/class-grader";

import { CourseRegistration } from "./business-logics/course-registration";
import { ArchiveProvider } from "./.gen/providers/archive/provider";
import { RandomProvider } from "./.gen/providers/random/provider";
import { StaticSitePattern } from "./patterns/static-site";

dotenv.config();

class GcpLabEngineStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  async buildGcpLabEngineStack() {
    const projectId = process.env.PROJECTID!;
    const suffix = process.env.SUFFIX ?? "";
    new GoogleProvider(this, "google", {});
    const archiveProvider = new ArchiveProvider(this, "archive", {});
    const randomProvider = new RandomProvider(this, "random", {});

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
      archiveProvider: archiveProvider,
      randomProvider: randomProvider,
    });

    //For the first deployment, it takes a while for API to be enabled.
    // await new Promise(r => setTimeout(r, 30000));

    const courseRegistration = await CourseRegistration.create(this, "course-registration", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      suffix
    });

    const calendarTriggerPattern = await CalendarTriggerPattern.create(this, "calendar-trigger", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      suffix: ""
    });

    const classGrader = await ClassGrader.create(this, "class-grader", {
      cloudFunctionDeploymentConstruct: cloudFunctionDeploymentConstruct,
      calendarTriggerPattern: calendarTriggerPattern,
      randomProvider: randomProvider,
      suffix
    });



    new TerraformOutput(this, "gameTaskUrl", {
      value: classGrader.gameTaskUrl,
    });
    new TerraformOutput(this, "graderUrl", {
      value: classGrader.graderUrl,
    });
    new TerraformOutput(this, "registration-url", {
      value: courseRegistration.registrationUrl,
    });

    const staticSitePattern = new StaticSitePattern(this, "static-site", {
      project: project.projectId,
      region: process.env.REGION!,
      randomProvider: randomProvider,
    });
    new TerraformOutput(this, "static-site-url", {
      value: "https://storage.googleapis.com/" + staticSitePattern.siteBucket.name,
    });
    new TerraformOutput(this, "static-site-bucket", {
      value: staticSitePattern.siteBucket.name,
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

