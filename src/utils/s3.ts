import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config/config.js";
import s3 from "../s3/connect.js";

export const uploadFile = async (key: string, file: Express.Multer.File) => {
    const command = new PutObjectCommand({
        Bucket: config().S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await s3.send(command);
};

export const deleteFile = async (key: string) => {
    const command = new DeleteObjectCommand({
        Bucket: config().S3_BUCKET_NAME,
        Key: key,
    });

    await s3.send(command);
};

export const getSignedUrlByKey = async (key: string) => {
    const command = new GetObjectCommand({
        Bucket: config().S3_BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3, command, { expiresIn: 3600 });
};
