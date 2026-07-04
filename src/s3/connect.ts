// import * as S3 from "aws-sdk/clients/s3";
import { S3Client } from "@aws-sdk/client-s3";
import config from "../config/config.js";

export default function Connect() {
    return new S3Client({
        region: config().AWS_REGION,
        endpoint: {
            url: new URL(config().S3_ENDPOINT_URL),
        },
        credentials: {
            accessKeyId: config().S3_ACCESS_KEY,
            secretAccessKey: config().S3_SECRET_KEY,
        },
    });
}
