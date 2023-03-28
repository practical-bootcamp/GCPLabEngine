import { Construct } from "constructs";
import { StorageBucketObject } from "./../.gen/providers/google/storage-bucket-object";
import { ServiceAccount } from "./../.gen/providers/google/service-account";
import { ProjectIamBinding } from "./../.gen/providers/google/project-iam-binding";
import { Cloudfunctions2Function } from "../.gen/providers/google/cloudfunctions2-function";


import { ArchiveProvider } from "../.gen/providers/archive/provider";
import { DataArchiveFile } from "../.gen/providers/archive/data-archive-file";
import path = require("path");
import { hashElement } from 'folder-hash';
import { TerraformOutput } from "cdktf";
import { CloudFunctionDeploymentConstruct } from "./cloud-function-deployment-construct";

export interface CloudFunctionConstructProps {
    readonly functionName: string;
    readonly entryPoint: string;
    readonly environmentVariables?: { [key: string]: string };
    readonly cloudFunctionDeploymentConstruct: CloudFunctionDeploymentConstruct;
}

export class CloudFunctionConstruct extends Construct {
    public cloudFunction?: Cloudfunctions2Function;

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

        const serviceAccount = new ServiceAccount(this, "service-account", {
            accountId: "google-calendar-poller",
            project: props.cloudFunctionDeploymentConstruct.projectId,
            displayName: "Google Calendar Poller Service Account",
        });
        new ProjectIamBinding(this, "service-account-binding", {
            project: props.cloudFunctionDeploymentConstruct.projectId,
            role: "roles/pubsub.publisher",
            members: ["serviceAccount:" + serviceAccount.email],
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
                serviceAccountEmail: serviceAccount.email,
                environmentVariables: props.environmentVariables
            }
        });
        new TerraformOutput(this, "cloud-function-url", {
            value: this.cloudFunction.serviceConfig.uri
        })
    }
}
