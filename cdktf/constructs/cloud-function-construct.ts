import { Construct } from "constructs";
import { StorageBucketObject } from "../.gen/providers/google/storage-bucket-object";
import { ServiceAccount } from "../.gen/providers/google/service-account";
import { Cloudfunctions2Function, Cloudfunctions2FunctionEventTrigger } from "../.gen/providers/google/cloudfunctions2-function";
import { Cloudfunctions2FunctionIamBinding } from "../.gen/providers/google/cloudfunctions2-function-iam-binding";
import { CloudRunServiceIamBinding } from "../.gen/providers/google/cloud-run-service-iam-binding";
import { DataArchiveFile } from "../.gen/providers/archive/data-archive-file";
import path = require("path");
import { hashElement } from 'folder-hash';
import { CloudFunctionDeploymentConstruct } from "./cloud-function-deployment-construct";

export interface CloudFunctionConstructProps {
    readonly functionName: string;
    readonly entryPoint?: string;
    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
    readonly environmentVariables?: { [key: string]: string };
    readonly eventTrigger?: Cloudfunctions2FunctionEventTrigger;
}

export class CloudFunctionConstruct extends Construct {
    public cloudFunction!: Cloudfunctions2Function;
    public serviceAccount: ServiceAccount;
    private props: CloudFunctionConstructProps;
    public project: string;

    private constructor(scope: Construct, id: string, props: CloudFunctionConstructProps) {
        super(scope, id);
        this.serviceAccount = new ServiceAccount(this, "service-account", {
            accountId: props.functionName,
            project: props.cloudFunctionDeploymentConstruct.project,
            displayName: props.functionName,
        });
        this.props = props;
        this.project = props.cloudFunctionDeploymentConstruct.project;
    }

    private async build(props: CloudFunctionConstructProps) {
        
        const options = {
            folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
            files: { include: ['*.js', '*.json'] },
        };
        const hash = await hashElement(path.resolve(__dirname, "..", "..", "functions", this.props.functionName), options);
        const outputFileName = `function-source-${hash.hash}.zip`;
        const code = new DataArchiveFile(this, "archiveFile", {
            type: "zip",
            sourceDir: path.resolve(__dirname, "..", "..", "functions", this.props.functionName),
            outputPath: path.resolve(__dirname, "..", "cdktf.out", "functions", outputFileName)
        });

        const storageBucketObject = new StorageBucketObject(this, "storage-bucket-object", {
            name: outputFileName,
            bucket: this.props.cloudFunctionDeploymentConstruct.sourceBucket.name,
            source: code.outputPath,
        });

        this.cloudFunction = new Cloudfunctions2Function(this, "cloud-function", {
            name: this.props.functionName,
            project: this.props.cloudFunctionDeploymentConstruct.project,
            location: this.props.cloudFunctionDeploymentConstruct.region,
            buildConfig: {
                runtime: "nodejs18",
                entryPoint: this.props.entryPoint ?? this.props.functionName,
                source: {
                    storageSource: {
                        bucket: this.props.cloudFunctionDeploymentConstruct.sourceBucket.name,
                        object: storageBucketObject.name,
                    }
                }
            },
            serviceConfig: {
                maxInstanceCount: 1,
                availableMemory: "128Mi",
                timeoutSeconds: 60,
                serviceAccountEmail: this.serviceAccount.email,
                environmentVariables: props.environmentVariables ?? {},
            },
            eventTrigger: props.eventTrigger,
        });

        new Cloudfunctions2FunctionIamBinding(this, "cloudfunctions2-function-iam-member", {
            project: this.cloudFunction.project,
            location: this.cloudFunction.location,
            cloudFunction: this.cloudFunction.name,
            role: "roles/cloudfunctions.invoker",
            members: ["serviceAccount:" + this.serviceAccount.email]
        });

        new CloudRunServiceIamBinding(this, "cloud-run-service-iam-binding", {
            project: this.props.cloudFunctionDeploymentConstruct.project,
            location: this.cloudFunction.location,
            service: this.cloudFunction.name,
            role: "roles/run.invoker",
            members: ["serviceAccount:" + this.serviceAccount.email]
        });
    }

    public static async createCloudFunctionConstruct(scope: Construct, id: string, props: CloudFunctionConstructProps) {
        const me = new CloudFunctionConstruct(scope, id, props);
        await me.build(props);
        return me;
    }
}
