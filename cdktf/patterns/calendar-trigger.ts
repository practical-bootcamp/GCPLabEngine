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
    startEventTopic!: PubsubTopic;
    endEventTopic!: PubsubTopic;

    private constructor(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        super(scope, id);
        this.props = props;
    }

    public async build(props: CalendarTriggerPatternProps) {
        this.startEventTopic = new PubsubTopic(this, "start-pubsub-topic", {
            name: "start-calendar-event-pubsub-topic" + props.suffix,
            project: props.cloudFunctionDeploymentConstruct.project,
        });

        this.endEventTopic = new PubsubTopic(this, "end-pubsub-topic", {
            name: "end-calendar-event-pubsub-topic" + props.suffix,
            project: props.cloudFunctionDeploymentConstruct.project,
        });

        this.cloudFunctionConstruct = await CloudFunctionConstruct.createCloudFunctionConstruct(this, "cloud-function", {
            functionName: "google-calendar-poller" + props.suffix,
            entryPoint: "google-calendar-poller",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            environmentVariables: {
                "ICALURL": process.env.ICALURL!,
                "SUFFIX": this.props.suffix,
                "START_EVENT_TOPIC_ID": this.startEventTopic.id,
                "END_EVENT_TOPIC_ID": this.endEventTopic.id,
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

        new TerraformOutput(this, "startEventTopic", {
            value: this.startEventTopic.id
        });
        new TerraformOutput(this, "endEventTopic", {
            value: this.endEventTopic.id
        });
    }

    public static async createCalendarTriggerPattern(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        const me = new CalendarTriggerPattern(scope, id, props);
        await me.build(props);
        return me;
    }
}
