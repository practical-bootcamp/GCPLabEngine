import { Construct } from "constructs";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
import { DataStoreConstruct } from "../constructs/datastore-construct";
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
    cloudFunctionConstruct: CloudFunctionConstruct;
    calendarDataStore: DataStoreConstruct;
    props: CalendarTriggerPatternProps;
    newEventTopic: PubsubTopic;

    constructor(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        super(scope, id);
        this.props = props;

        this.cloudFunctionConstruct = new CloudFunctionConstruct(this, "cloud-function", {
            functionName: "google-calendar-poller" + props.suffix,
            entryPoint: "http_handler",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
        });

        this.calendarDataStore = new DataStoreConstruct(this, "calendar-event-data-store", {
            cloudFunctionConstruct: this.cloudFunctionConstruct,
            kind: "calendar-event" + props.suffix,
            properties: [
                {
                    name: "start",
                    direction: "ASCENDING",
                },
                {
                    name: "end",
                    direction: "ASCENDING",
                }
            ],
            appEngineApplication: props.dummyAppEngineApplication,
        });

        new ProjectIamMember(this, "DatastoreProjectIamMember", {
            project: this.cloudFunctionConstruct.project,
            role: "roles/datastore.user",
            member: "serviceAccount:" + this.cloudFunctionConstruct.serviceAccount.email,
        });
        new ProjectIamMember(this, "PubSubProjectIamMember", {
            project: this.cloudFunctionConstruct.project,
            role: "roles/pubsub.publisher",
            member: "serviceAccount:" + this.cloudFunctionConstruct.serviceAccount.email,            
        });

        this.newEventTopic = new PubsubTopic(this, "pubsub-topic", {
            name: "calendar-event-pubsub-topic" + props.suffix,
            project: this.cloudFunctionConstruct.project,
        });
    }

    public async build() {
        await this.cloudFunctionConstruct.createCloudFunction({
            "ICALURL": process.env.ICALURL!,
            "calendarDataStore": this.calendarDataStore.datastoreIndex.id,
            "SUFFIX": this.props.suffix,
            "NEW_EVENT_TOPIC_ID": this.newEventTopic.id,
        });
        new CloudSchedulerConstruct(this, "cloud-scheduler", {
            name: "google-calendar-poller-scheduler" + this.props.suffix,
            cronExpression: this.props.cronExpression ?? "*/15 * * * *",
            cloudFunctionConstruct: this.cloudFunctionConstruct,
        });

    }
}
