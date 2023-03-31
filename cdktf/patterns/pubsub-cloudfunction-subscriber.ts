import { Construct } from "constructs";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";
import { PubsubTopic } from "../.gen/providers/google/pubsub-topic";
import { PubsubSubscription } from "../.gen/providers/google/pubsub-subscription";


export interface PubSubCloudFunctionSubscriberPatternProps {

    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
    readonly functionName: string;
    readonly eventTopic: PubsubTopic;
    readonly filter?: string;
    readonly environmentVariables?: { [key: string]: string; };
}

export class PubSubCloudFunctionSubscriberPattern extends Construct {
    cloudFunctionConstruct!: CloudFunctionConstruct;
    props: PubSubCloudFunctionSubscriberPatternProps;

    private constructor(scope: Construct, id: string, props: PubSubCloudFunctionSubscriberPatternProps) {
        super(scope, id);
        this.props = props;
    }

    private async build(props: PubSubCloudFunctionSubscriberPatternProps) {
        const cloudFunctionConstruct = await CloudFunctionConstruct.create(this, "cloud-function", {
            functionName: props.functionName,
            runtime: "nodejs16",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            environmentVariables: props.environmentVariables,
        });

        new PubsubSubscription(this, "subscription", {
            name: props.functionName + "-subscription",
            topic: props.eventTopic.name,
            project: props.cloudFunctionDeploymentConstruct.project,
            ackDeadlineSeconds: 20,
            retainAckedMessages: true,
            messageRetentionDuration: "1200s",
            pushConfig:
            {
                pushEndpoint: cloudFunctionConstruct.cloudFunction.serviceConfig.uri,
                oidcToken: {
                    serviceAccountEmail: cloudFunctionConstruct.serviceAccount.email
                }
            },
            filter: props.filter,
        });
    }

    public static async create(scope: Construct, id: string, props: PubSubCloudFunctionSubscriberPatternProps) {
        const me = new PubSubCloudFunctionSubscriberPattern(scope, id, props);
        await me.build(props);
        return me;
    }
}