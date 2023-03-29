import { Construct } from "constructs";
import { DatastoreIndex, DatastoreIndexProperties } from "./../.gen/providers/google/datastore-index";
import { CloudFunctionConstruct } from "./cloud-function-construct";
import { ProjectIamMember } from "../.gen/providers/google/project-iam-member";
import { ProjectService } from "../.gen/providers/google/project-service";
import { AppEngineApplication } from "../.gen/providers/google/app-engine-application";

export interface DataStoreConstructProps {
    readonly kind: string;
    readonly properties: DatastoreIndexProperties[];
    readonly cloudFunctionConstruct: CloudFunctionConstruct;
    readonly appEngineApplication: AppEngineApplication;
}

export class DataStoreConstruct extends Construct {
    public readonly datastoreIndex: DatastoreIndex;
    constructor(scope: Construct, id: string, props: DataStoreConstructProps) {
        super(scope, id);

        const apis = [
            "datastore.googleapis.com",
            "firestore.googleapis.com"
        ];
        const services = [];
        for (const api of apis) {
            services.push(new ProjectService(this, `${api.replaceAll(".", "")}`, {
                project: props.cloudFunctionConstruct.project,
                service: api,
                disableOnDestroy: false,
            }));
        }
        services.push(props.appEngineApplication);

        this.datastoreIndex = new DatastoreIndex(this, "datastore-index", {
            kind: props.kind,
            properties: props.properties,
            project: props.cloudFunctionConstruct.project,
            dependsOn: services
        });

        if (props.cloudFunctionConstruct) {
            new ProjectIamMember(this, "ProjectIamMember", {
                project: props.cloudFunctionConstruct.project,
                role: "roles/datastore.user",
                member: "serviceAccount:" + props.cloudFunctionConstruct.serviceAccount!.email,
                condition: {
                    title: "datastore.user for " + props.kind + " index",
                    description: "datastore.user for " + props.kind + " index",
                    expression: `resource.type == \"cloud_datastore_database\" && resource.name == \"${this.datastoreIndex.id}\"`,
                }
            });
        }
    }
}
