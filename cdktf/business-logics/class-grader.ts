import { Construct } from "constructs";
import { PubSubCloudFunctionSubscriberPattern } from "../patterns/pubsub-cloudfunction-subscriber";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";
import { CalendarTriggerPattern } from "../patterns/calendar-trigger";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";



export interface ClassGraderProps {
    readonly calendarTriggerPattern: CalendarTriggerPattern;
    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
}

export class ClassGrader extends Construct {
    props: ClassGraderProps;

    private constructor(scope: Construct, id: string, props: ClassGraderProps) {
        super(scope, id);
        this.props = props;
    }

    private async build(props: ClassGraderProps) {    

        const graderCloudFunctionConstruct = await CloudFunctionConstruct.create(this, "grader-cloud-function", {
            functionName: "grader",
            entryPoint: "Grader.Function",
            runtime: "dotnet6",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            makePublic: true,
        });

        await PubSubCloudFunctionSubscriberPattern.create(this, "class-grader-pubsub-cloud-function-subscriber", {
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            functionName: "class-grader",
            eventTopic: props.calendarTriggerPattern.eventTopic,
            filter: `attributes.type="START"`,
            environmentVariables: {
                "GRADER_FUNCTION_URL": graderCloudFunctionConstruct.cloudFunction.serviceConfig.uri,
            }
        });

    }

    public static async create(scope: Construct, id: string, props: ClassGraderProps) {
        const me = new ClassGrader(scope, id, props);
        await me.build(props);
        return me;
    }
}