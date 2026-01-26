import { Client, Storage } from "appwrite";

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const storage = new Storage(client);

export async function uploadFile(file: File | undefined) {

    if(!file) throw new Error('File is undefined')

    const fileKey = Date.now().toString() + "_" + file.name.replace(' ', '-')
    const fileId = fileKey.slice(0, 15)
    const res = await storage.createFile(process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!, fileId , file, [] ,(progress) => console.log(progress.progress))

    return { fileName: res.name, fileKey}
}

export const getFileURL = (fileKey: string) => storage.getFileView(process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!, fileKey.slice(0, 15))