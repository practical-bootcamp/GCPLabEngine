import { Construct } from "constructs";
import { ProjectIamMember } from "../.gen/providers/google/project-iam-member";
import { StorageBucket } from "../.gen/providers/google/storage-bucket";
import { StorageBucketIamMember } from "../.gen/providers/google/storage-bucket-iam-member";
import { RandomProvider } from "../.gen/providers/random/provider";
import { StringResource } from "../.gen/providers/random/string-resource";
import { CloudFunctionConstruct } from "../constructs/cloud-function-construct";
import { CloudFunctionDeploymentConstruct } from "../constructs/cloud-function-deployment-construct";
import { CalendarTriggerPattern } from "../patterns/calendar-trigger";
import { PubSubCloudFunctionSubscriberPattern } from "../patterns/pubsub-cloudfunction-subscriber";


export interface ClassGraderProps {
    readonly calendarTriggerPattern: CalendarTriggerPattern;
    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
    readonly randomProvider: RandomProvider;
    readonly suffix: string;
}

export class ClassGrader extends Construct {
    props: ClassGraderProps;
    public testResultBucket!: StorageBucket;
    public gameTaskUrl!: string;
    public graderUrl!: string;

    private constructor(scope: Construct, id: string, props: ClassGraderProps) {
        super(scope, id);
        this.props = props;
    }

    private async build(props: ClassGraderProps) {
        const bucketSuffix = new StringResource(this, "bucketPrefix", {
            length: 8,
            special: false,
            upper: false,
        })

        this.testResultBucket = new StorageBucket(this, "sourceBucket", {
            name: "test-result-" + bucketSuffix.result,
            project: props.cloudFunctionDeploymentConstruct.project,
            location: props.cloudFunctionDeploymentConstruct.region,
            storageClass: "REGIONAL",
            forceDestroy: true,
            uniformBucketLevelAccess: true,
        });

        const graderCloudFunctionConstruct = await CloudFunctionConstruct.create(this, "grader-cloud-function", {
            functionName: "grader",
            entryPoint: "Grader.Function",
            runtime: "dotnet6",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            makePublic: true,
            environmentVariables: {
                "SUFFIX": props.suffix,
            }
        });
        this.graderUrl = graderCloudFunctionConstruct.cloudFunction.serviceConfig.uri;

        const gameTaskCloudFunctionConstruct = await CloudFunctionConstruct.create(this, "game-task-cloud-function", {
            functionName: "gameTask",
            functionCode: "grader",
            entryPoint: "Grader.GameTask",
            runtime: "dotnet6",
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            makePublic: true,
        });
        this.gameTaskUrl = gameTaskCloudFunctionConstruct.cloudFunction.serviceConfig.uri;

        const pubSubCloudFunctionSubscriberPattern = await PubSubCloudFunctionSubscriberPattern.create(this, "class-grader-pubsub-cloud-function-subscriber", {
            cloudFunctionDeploymentConstruct: props.cloudFunctionDeploymentConstruct,
            functionName: "class-grader",
            eventTopic: props.calendarTriggerPattern.eventTopic,
            filter: `attributes.type="START"`,
            environmentVariables: {
                "GRADER_FUNCTION_URL": graderCloudFunctionConstruct.cloudFunction.serviceConfig.uri,
                "TEST_RESULT_BUCKET": this.testResultBucket.name,
            }
        });

        new ProjectIamMember(this, "DatastoreProjectIamMember", {
            project: props.cloudFunctionDeploymentConstruct.project,
            role: "roles/datastore.user",
            member: "serviceAccount:" + pubSubCloudFunctionSubscriberPattern.cloudFunctionConstruct.serviceAccount.email,
        });

        new StorageBucketIamMember(this, "StorageBucketIamMember", {
            bucket: this.testResultBucket.name,
            role: "roles/storage.objectCreator",
            member: "serviceAccount:" + pubSubCloudFunctionSubscriberPattern.cloudFunctionConstruct.serviceAccount.email,
        });

        new ProjectIamMember(this, "PubSubProjectIamMember", {
            project: props.cloudFunctionDeploymentConstruct.project,
            role: "roles/pubsub.subscriber",
            member: "serviceAccount:" + pubSubCloudFunctionSubscriberPattern.cloudFunctionConstruct.serviceAccount.email,
        });
    }

    public static async create(scope: Construct, id: string, props: ClassGraderProps) {
        const me = new ClassGrader(scope, id, props);
        await me.build(props);
        return me;
    }
}