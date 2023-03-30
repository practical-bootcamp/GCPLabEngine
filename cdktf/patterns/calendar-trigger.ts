import { Construct } from "constructs";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";
import { CloudSchedulerConstruct } from "../constructs/cloud-scheduler-construct";
import { ProjectIamMember } from "../.gen/providers/google/project-iam-member";
import { PubsubTopic } from "../.gen/providers/google/pubsub-topic";
import { TerraformOutput } from "cdktf";


export interface CalendarTriggerPatternProps {
    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
    readonly suffix: string;
    readonly cronExpression?: string;
}

export class CalendarTriggerPattern extends Construct {
    cloudFunctionConstruct!: CloudFunctionConstruct;
    props: CalendarTriggerPatternProps;
    eventTopic!: PubsubTopic;   

    private constructor(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        super(scope, id);
        this.props = props;
    }

    private async build(props: CalendarTriggerPatternProps) {
        this.eventTopic = new PubsubTopic(this, "start-pubsub-topic", {
            name: "start-calendar-event-pubsub-topic" + props.suffix,
            project: props.cloudFunctionDeploymentConstruct.project,
        });

        this.cloudFunctionConstruct = await CloudFunctionConstruct.createCloudFunctionConstruct(this, "cloud-function", {
            functionName: "google-calendar-poller" + props.suffix,
            entryPoint: "google-calendar-poller",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            environmentVariables: {
                "ICALURL": process.env.ICALURL!,
                "SUFFIX": this.props.suffix,
                "EVENT_TOPIC_ID": this.eventTopic.id,               
            }
        });

        new ProjectIamMember(this, "DatastoreProjectIamMember", {
            project: props.cloudFunctionDeploymentConstruct.project,
            role: "roles/datastore.user",
            member: "serviceAccount:" + this.cloudFunctionConstruct.serviceAccount.email,
        });
        new ProjectIamMember(this, "PubSubProjectIamMember", {
            project: props.cloudFunctionDeploymentConstruct.project,
            role: "roles/pubsub.publisher",
            member: "serviceAccount:" + this.cloudFunctionConstruct.serviceAccount.email,
        });

        new CloudSchedulerConstruct(this, "cloud-scheduler", {
            name: "google-calendar-poller-scheduler" + this.props.suffix,
            cronExpression: this.props.cronExpression ?? "*/15 * * * *",
            cloudFunctionConstruct: this.cloudFunctionConstruct,
        });
 
        new TerraformOutput(this, "calender-event-topic", {
            value: this.eventTopic.id
        });
    }

    public static async create(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        const me = new CalendarTriggerPattern(scope, id, props);
        await me.build(props);
        return me;
    }
}
