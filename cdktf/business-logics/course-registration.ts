import { Construct } from "constructs";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
import { ProjectIamMember } from "../.gen/providers/google/project-iam-member";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";

export interface CourseRegistrationProps {
    cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
}

export class CourseRegistration extends Construct {
    public registrationUrl!: string;

    constructor(scope: Construct, id: string) {
        super(scope, id);
    }

    private async build(props: CourseRegistrationProps) {
        const cloudFunctionConstruct = await CloudFunctionConstruct.create(this, "cloud-function", {
            functionName: "registration",
            runtime: "nodejs16",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            makePublic: true,
        });

        new ProjectIamMember(this, "DatastoreProjectIamMember", {
            project: props.cloudFunctionDeploymentConstruct.project,
            role: "roles/datastore.user",
            member: "serviceAccount:" + cloudFunctionConstruct.serviceAccount.email,
        });

        this.registrationUrl = cloudFunctionConstruct.cloudFunction.serviceConfig.uri;
    }

    public static async create(scope: Construct, id: string, props: CourseRegistrationProps) {
        const me = new CourseRegistration(scope, id);
        await me.build(props);
        return me;
    }
}
