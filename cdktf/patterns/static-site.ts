import { Construct } from "constructs";
import { StorageBucket } from "../.gen/providers/google/storage-bucket";
import { StorageBucketAccessControl } from "../.gen/providers/google/storage-bucket-access-control";

import { StringResource } from "../.gen/providers/random/string-resource";
import { RandomProvider } from "../.gen/providers/random/provider";
import { ProjectService } from "../.gen/providers/google/project-service";


export interface StaticSitePatternProps {
    readonly project: string;
    readonly region: string;
    readonly mainPageSuffix?: string;
    readonly notFoundPage?: string;
    readonly randomProvider: RandomProvider;
}

export class StaticSitePattern extends Construct {
    public readonly siteBucket: StorageBucket;
    constructor(scope: Construct, id: string, props: StaticSitePatternProps) {
        super(scope, id);
        const bucketSuffix = new StringResource(this, "bucketPrefix", {
            length: 8,
            special: false,
            upper: false,
        })

        const apis = [
            "storage-api.googleapis.com",
            "storage-component.googleapis.com",
        ];
        const services = [];
        for (const api of apis) {
            services.push(new ProjectService(this, `${api.replaceAll(".", "")}`, {
                project: props.project,
                service: api,
                disableOnDestroy: false,
            }));
        }
        this.siteBucket = new StorageBucket(this, "sourceBucket", {
            name: "website-" + bucketSuffix.result,
            project: props.project,
            location: props.region,
            storageClass: "REGIONAL",
            forceDestroy: true,
            // uniformBucketLevelAccess: true,
            website: {
                mainPageSuffix: props.mainPageSuffix ?? "index.html",
                notFoundPage: props.notFoundPage ?? "404.html",
            },
            cors: [{
                origin: ["*"],
                method: ["GET", "HEAD", "PUT", "POST", "DELETE"],
                responseHeader: ["*"],
                maxAgeSeconds: 3600,
            }],
            dependsOn: services
        });
        new StorageBucketAccessControl(this, "bucketAccessControl", {
            bucket: this.siteBucket.id,
            role: "READER",
            entity: "allUsers",
        });
    }

}
