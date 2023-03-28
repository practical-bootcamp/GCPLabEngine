import { Construct } from "constructs";
import { StorageBucketObject } from "./../.gen/providers/google/storage-bucket-object";
import { ServiceAccount } from "./../.gen/providers/google/service-account";
import { Cloudfunctions2Function } from "../.gen/providers/google/cloudfunctions2-function";
import { Cloudfunctions2FunctionIamBinding } from "./../.gen/providers/google/cloudfunctions2-function-iam-binding";
import { CloudRunServiceIamBinding } from "./../.gen/providers/google/cloud-run-service-iam-binding";
import { ArchiveProvider } from "../.gen/providers/archive/provider";
import { DataArchiveFile } from "../.gen/providers/archive/data-archive-file";
import path = require("path");
import { hashElement } from 'folder-hash';
import { CloudFunctionDeploymentConstruct } from "./cloud-function-deployment-construct";

export interface CloudFunctionConstructProps {
    readonly functionName: string;
    readonly entryPoint: string;
    readonly environmentVariables?: { [key: string]: string };
    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
}

export class CloudFunctionConstruct extends Construct {
    public cloudFunction?: Cloudfunctions2Function;
    public serviceAccount?: ServiceAccount;

    constructor(scope: Construct, id: string) {
        super(scope, id);
    }

    public async build(props: CloudFunctionConstructProps) {
        new ArchiveProvider(this, "archive", {});
        const options = {
            folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
            files: { include: ['*.js', '*.json'] },
        };
        const hash = await hashElement(path.resolve(__dirname, "..", "..", "functions", props.functionName), options);
        const outputFileName = `function-source-${hash.hash}.zip`;
        const code = new DataArchiveFile(this, "archiveFile", {
            type: "zip",
            sourceDir: path.resolve(__dirname, "..", "..", "functions", props.functionName),
            outputPath: path.resolve(__dirname, "..", "cdktf.out", outputFileName)
        });

        const storageBucketObject = new StorageBucketObject(this, "storage-bucket-object", {
            name: outputFileName,
            bucket: props.cloudFunctionDeploymentConstruct.sourceBucket.name,
            source: code.outputPath,
        });

        this.serviceAccount = new ServiceAccount(this, "service-account", {
            accountId: props.functionName,
            project: props.cloudFunctionDeploymentConstruct.projectId,
            displayName: props.functionName,
        });

        this.cloudFunction = new Cloudfunctions2Function(this, "cloud-function", {
            name: props.functionName,
            location: "us-central1",
            buildConfig: {
                runtime: "nodejs18",
                entryPoint: props.entryPoint,
                source: {
                    storageSource: {
                        bucket: props.cloudFunctionDeploymentConstruct.sourceBucket.name,
                        object: storageBucketObject.name,
                    }
                }
            },
            serviceConfig: {
                maxInstanceCount: 1,
                availableMemory: "128Mi",
                timeoutSeconds: 60,
                serviceAccountEmail: this.serviceAccount.email,
                environmentVariables: props.environmentVariables
            },
        });
        new Cloudfunctions2FunctionIamBinding(this, "cloudfunctions2-function-iam-member", {
            project: this.cloudFunction.project,
            location: this.cloudFunction.location,
            cloudFunction: this.cloudFunction.name,
            role: "roles/cloudfunctions.invoker",
            members: ["serviceAccount:" + this.serviceAccount.email]
        });

        new CloudRunServiceIamBinding(this, "cloud-run-service-iam-binding", {
            project: props.cloudFunctionDeploymentConstruct.projectId,
            location: this.cloudFunction.location,
            service: this.cloudFunction.name,
            role: "roles/run.invoker",
            members: ["serviceAccount:" + this.serviceAccount.email]
        });
    }
}
