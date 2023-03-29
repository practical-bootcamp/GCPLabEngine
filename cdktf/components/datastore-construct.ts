import { Construct } from "constructs";
import { DatastoreIndex, DatastoreIndexProperties } from "./../.gen/providers/google/datastore-index";
import { CloudFunctionConstruct } from "./cloud-function-construct";
// import { ServiceAccountIamBinding } from "../.gen/providers/google/service-account-iam-binding";
import { ProjectService } from "../.gen/providers/google/project-service";
import { AppEngineApplication } from "../.gen/providers/google/app-engine-application";

export interface DataStoreConstructProps {
    readonly kind: string;
    readonly properties: DatastoreIndexProperties[];
    readonly cloudFunctionConstruct?: CloudFunctionConstruct;
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
                project: props.cloudFunctionConstruct!.cloudFunction!.project,
                service: api,
                disableOnDestroy: false,
            }));
        }
        services.push(props.appEngineApplication);

        this.datastoreIndex = new DatastoreIndex(this, "datastore-index", {
            kind: props.kind,
            properties: props.properties,
            project: props.cloudFunctionConstruct!.cloudFunction!.project,
            dependsOn: services
        });

        if (props.cloudFunctionConstruct) {
            // new ServiceAccountIamBinding(this, "service-account-iam-binding", {
            //     serviceAccountId: props.cloudFunctionConstruct.serviceAccount!.name,
            //     role: "roles/datastore.user",
            //     members: ["serviceAccount:" + props.cloudFunctionConstruct.serviceAccount!.email],
            //     condition: {
            //         title: "always-true",
            //         description: "This condition is always true",
            //         expression: `resource.type == \"cloud_datastore_database\"&& resource.id == \"${this.datastoreIndex.id}\"`,
            //     }
            // });
            // const env = props.cloudFunctionConstruct.cloudFunction!.serviceConfig.environmentVariables;
            // env[props.kind] = this.datastoreIndex.id;
            // props.cloudFunctionConstruct.cloudFunction!.serviceConfig.environmentVariables = env;
        }
    }
}
