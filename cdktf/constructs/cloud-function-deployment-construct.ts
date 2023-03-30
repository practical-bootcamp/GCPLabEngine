import { Construct } from "constructs";

import { StringResource } from "../.gen/providers/random/string-resource";
import { RandomProvider } from "../.gen/providers/random/provider";
import { StorageBucket } from "../.gen/providers/google/storage-bucket";
import { ProjectService } from "../.gen/providers/google/project-service";
import { ArchiveProvider } from "../.gen/providers/archive/provider";


export interface CloudFunctionDeploymentConstructProps {
    readonly project: string;
    readonly region: string;
}

export class CloudFunctionDeploymentConstruct extends Construct {
    public readonly sourceBucket: StorageBucket;
    public readonly project: string;
    readonly region: string;

    constructor(scope: Construct, id: string, props: CloudFunctionDeploymentConstructProps) {
        super(scope, id);
        new ArchiveProvider(this, "archive", {});
        new RandomProvider(this, "random", {});

        this.project = props.project;
        this.region = props.region;

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
            "eventarc.googleapis.com",
        ];
        const services = [];
        for (const api of apis) {
            services.push(new ProjectService(this, `${api.replaceAll(".", "")}`, {
                project: props.project,
                service: api,
                disableOnDestroy: false,
            }));
        }

        const bucketSuffix = new StringResource(this, "bucketPrefix", {
            length: 8,
            special: false,
            upper: false,
        })

        this.sourceBucket = new StorageBucket(this, "sourceBucket", {
            name: "source" + bucketSuffix.result,
            project: props.project,
            location: props.region,
            storageClass: "REGIONAL",
            forceDestroy: true,
            uniformBucketLevelAccess: true,
            lifecycleRule: [{
                action: {
                    type: "Delete"
                },
                condition: {
                    age: 1
                }
            }],
            dependsOn: services
        });
    }
}