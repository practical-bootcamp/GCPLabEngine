import { Construct } from "constructs";

import { StringResource } from "./../.gen/providers/random/string-resource";
import { RandomProvider } from "./../.gen/providers/random/provider";
import { StorageBucket } from "./../.gen/providers/google/storage-bucket";
import { StorageBucketObject } from "./../.gen/providers/google/storage-bucket-object";
import { ProjectService } from "./../.gen/providers/google/project-service/index";
import { ServiceAccount } from "./../.gen/providers/google/service-account";
import { ProjectIamBinding } from "./../.gen/providers/google/project-iam-binding";

import { Cloudfunctions2Function } from "../.gen/providers/google/cloudfunctions2-function";
// import { ApikeysKey } from "../.gen/providers/google/apikeys-key";


import { ArchiveProvider } from "../.gen/providers/archive/provider";
import { DataArchiveFile } from "../.gen/providers/archive/data-archive-file";
import path = require("path");
import { hashElement } from 'folder-hash';
import { TerraformOutput } from "cdktf";

export interface CloudFunctionConstructProps {
    readonly projectId: string;
}

export class CloudFunctionConstruct extends Construct {

    constructor(scope: Construct, id: string) {
        super(scope, id);
    }

    public async build(props: CloudFunctionConstructProps) {

        new ArchiveProvider(this, "archive", {});
        new RandomProvider(this, "random", {});

        const bucketSuffix = new StringResource(this, "bucketPrefix", {
            length: 8,
            special: false,
            upper: false,
        })

        const sourceBucket = new StorageBucket(this, "sourceBucket", {
            name: "source" + bucketSuffix.result,
            location: "US",
            forceDestroy: true,
            uniformBucketLevelAccess: true,
            lifecycleRule: [{
                action: {
                    type: "Delete"
                },
                condition: {
                    age: 1
                }
            }]
        });

        const options = {
            folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
            files: { include: ['*.js', '*.json'] },
        };
        const hash = await hashElement(path.resolve(__dirname, "..", "..", "functions", "google-calendar-poller"), options);
        const outputFileName = `function-source-${hash.hash}.zip`;
        const code = new DataArchiveFile(this, "archiveFile", {
            type: "zip",
            sourceDir: path.resolve(__dirname, "..", "..", "functions", "google-calendar-poller"),
            outputPath: path.resolve(__dirname, "..", "cdktf.out", outputFileName)
        });

        const storageBucketObject = new StorageBucketObject(this, "storage-bucket-object", {
            name: outputFileName,
            bucket: sourceBucket.name,
            source: code.outputPath,
        });

        const apis = [
            "iam.googleapis.com",
            "cloudresourcemanager.googleapis.com",
            "apikeys.googleapis.com",
            "run.googleapis.com",
            "artifactregistry.googleapis.com",
            "cloudfunctions.googleapis.com",
            "storage-api.googleapis.com",
            "storage-component.googleapis.com",
            "cloudbuild.googleapis.com",
            "calendar-json.googleapis.com"];
        const services = [];
        for (const api of apis) {
            services.push(new ProjectService(this, `${api.replaceAll(".", "")}`, {
                project: props.projectId,
                service: api,
                disableOnDestroy: false,
            }));
        }

        const serviceAccount = new ServiceAccount(this, "service-account", {
            accountId: "google-calendar-poller",
            project: props.projectId,
            displayName: "Google Calendar Poller Service Account",
            dependsOn: services
        });
        new ProjectIamBinding(this, "service-account-binding", {
            project: props.projectId,
            role: "roles/pubsub.publisher",
            members: ["serviceAccount:" + serviceAccount.email],
        });

        const cloudFunction = new Cloudfunctions2Function(this, "cloud-function", {
            name: "google-calendar-poller",
            description: "Polls Google Calendar for events and publishes them to a Pub/Sub topic",
            location: "us-central1",
            buildConfig: {
                runtime: "nodejs18",
                entryPoint: "helloGET",
                source: {
                    storageSource: {
                        bucket: sourceBucket.name,
                        object: storageBucketObject.name,
                    }
                }
            },
            serviceConfig: {
                maxInstanceCount: 1,
                availableMemory: "128Mi",
                timeoutSeconds: 60,
                serviceAccountEmail: serviceAccount.email,
                environmentVariables: {
                    "ICALURL": process.env.ICALURL!,
                }
            }
            , dependsOn: services
        });
        new TerraformOutput(this, "cloud-function-url", {
            value: cloudFunction.serviceConfig.uri
        })
    }
}
