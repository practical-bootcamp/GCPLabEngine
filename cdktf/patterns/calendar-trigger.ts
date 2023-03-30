import { Construct } from "constructs";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
// import { DataStoreConstruct } from "../constructs/datastore-construct";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";
import { AppEngineApplication } from "../.gen/providers/google/app-engine-application";
import { CloudSchedulerConstruct } from "../constructs/cloud-scheduler-construct";
import { ProjectIamMember } from "../.gen/providers/google/project-iam-member";
import { PubsubTopic } from "../.gen/providers/google/pubsub-topic";


export interface CalendarTriggerPatternProps {
    cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
    suffix: string;
    cronExpression?: string;
    dummyAppEngineApplication: AppEngineApplication;
}

export class CalendarTriggerPattern extends Construct {
    cloudFunctionConstruct!: CloudFunctionConstruct;
    // calendarDataStore!: DataStoreConstruct;
    props: CalendarTriggerPatternProps;
    newEventTopic!: PubsubTopic;

    private constructor(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        super(scope, id);
        this.props = props;
    }

    public async build(props: CalendarTriggerPatternProps) {

        // this.calendarDataStore = new DataStoreConstruct(this, "calendar-event-data-store", {
        //     cloudFunctionConstruct: this.cloudFunctionConstruct,
        //     kind: "calendar-event" + props.suffix,
        //     properties: [
        //         {
        //             name: "start",
        //             direction: "ASCENDING",
        //         },
        //         {
        //             name: "end",
        //             direction: "ASCENDING",
        //         }
        //     ],
        //     appEngineApplication: props.dummyAppEngineApplication,
        // });

        this.newEventTopic = new PubsubTopic(this, "pubsub-topic", {
            name: "calendar-event-pubsub-topic" + props.suffix,
            project: props.cloudFunctionDeploymentConstruct.project,
        });

        this.cloudFunctionConstruct = await CloudFunctionConstruct.createCloudFunctionConstruct(this, "cloud-function", {
            functionName: "google-calendar-poller" + props.suffix,
            entryPoint: "http_handler",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            environmentVariables: {
                "ICALURL": process.env.ICALURL!,
                // "calendarDataStore": this.calendarDataStore.datastoreIndex.id,
                "SUFFIX": this.props.suffix,
                "NEW_EVENT_TOPIC_ID": this.newEventTopic.id,
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
    }

    public static async createCalendarTriggerPattern(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        const me = new CalendarTriggerPattern(scope, id, props);
        await me.build(props);
        return me;
    }
}
