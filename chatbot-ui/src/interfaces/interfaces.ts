export interface message{
    content:string;
    role:string;
    id:string;
    status?: "loading" | "done" | "error";
}

export interface Conversation {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}