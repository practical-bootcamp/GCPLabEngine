import { Construct } from "constructs";

import { StringResource } from "./../.gen/providers/random/string-resource";
import { RandomProvider } from "./../.gen/providers/random/provider";
import { StorageBucket } from "./../.gen/providers/google/storage-bucket";
import { StorageBucketObject } from "./../.gen/providers/google/storage-bucket-object";
import { ProjectService } from "./../.gen/providers/google/project-service/index";
import { Cloudfunctions2Function } from "../.gen/providers/google/cloudfunctions2-function";
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
        });

        const options = {
            folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
            files: { include: ['*.js', '*.json'] },
        };
        const hash = await hashElement(path.resolve(__dirname, "function", "google-calendar-poller"), options);
        const code = new DataArchiveFile(this, "archiveFile", {
            type: "zip",
            sourceDir: path.resolve(__dirname, "function", "google-calendar-poller"),
            outputPath: path.resolve(__dirname, "..", "cdktf.out", `function-source-${hash}.zip`)
        })


        const storageBucketObject = new StorageBucketObject(this, "storage-bucket-object", {
            name: "function-source.zip",
            bucket: sourceBucket.name,
            source: code.outputPath,
        });

        const apis = [
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

        const cloudFunction = new Cloudfunctions2Function(this, "cloud-function", {
            name: "google-calendar-poller",
            description: "Polls Google Calendar for events and publishes them to a Pub/Sub topic",
            location: "us-central1",
            buildConfig: {
                runtime: "nodejs18",
                entryPoint: "helloHttp",
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
            }
            , dependsOn: services
        });
        new TerraformOutput(this, "cloud-function-url", {
            value: cloudFunction.serviceConfig.uri
        })
    }
}
