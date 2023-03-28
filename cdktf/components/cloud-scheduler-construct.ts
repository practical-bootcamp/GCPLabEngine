
import { Construct } from "constructs";

import { CloudSchedulerJob } from "../.gen/providers/google/cloud-scheduler-job";
import { ProjectService } from "../.gen/providers/google/project-service";
import { CloudFunctionConstruct } from "./cloud-function-construct";


export interface CloudSchedulerConstructProps {
    readonly name: string;
    readonly cronExpression: string;
    readonly cloudFunctionConstruct: CloudFunctionConstruct;
}

export class CloudSchedulerConstruct extends Construct {
    constructor(scope: Construct, id: string, props: CloudSchedulerConstructProps) {
        super(scope, id);

        const apis = [
            "cloudscheduler.googleapis.com"
        ];
        const services = [];
        for (const api of apis) {
            services.push(new ProjectService(this, `${api.replaceAll(".", "")}`, {
                project: props.cloudFunctionConstruct.cloudFunction!.project,
                service: api,
                disableOnDestroy: false,
            }));
        }

        new CloudSchedulerJob(this, "cloud-scheduler-job", {
            project: props.cloudFunctionConstruct.cloudFunction!.project,
            name: props.name,
            description: "Trigger the " + props.cloudFunctionConstruct.cloudFunction!.name,
            schedule: props.cronExpression,
            region: props.cloudFunctionConstruct.cloudFunction!.location,
            httpTarget: {
                uri: props.cloudFunctionConstruct.cloudFunction!.serviceConfig.uri,
                httpMethod: "GET",
                oidcToken: {
                    serviceAccountEmail: props.cloudFunctionConstruct.serviceAccount!.email,
                }
            },
            dependsOn: services
        });
    }
}