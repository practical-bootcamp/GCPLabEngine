import { Construct } from "constructs";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
import { DataStoreConstruct } from "../constructs/datastore-construct";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";
import { AppEngineApplication } from "../.gen/providers/google/app-engine-application";
import { CloudSchedulerConstruct } from "../constructs/cloud-scheduler-construct";

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

    constructor(scope: Construct, id: string, props: CalendarTriggerPatternProps) {
        super(scope, id);
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
        this.props = props;
    }

    public async build() {
        await this.cloudFunctionConstruct.createCloudFunction({
            "ICALURL": process.env.ICALURL!,
            "calendarDataStore": this.calendarDataStore.datastoreIndex.id,
        });
        new CloudSchedulerConstruct(this, "cloud-scheduler", {
            name: "google-calendar-poller-scheduler" + this.props.suffix,
            cronExpression: this.props.cronExpression ?? "*/15 * * * *",
            cloudFunctionConstruct: this.cloudFunctionConstruct,
        });
    }
}
