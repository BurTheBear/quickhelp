import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
interface SocketUser {
    id: string;
    email: string;
}
declare module 'socket.io' {
    interface Socket {
        user?: SocketUser;
    }
}
export declare function getSocketServer(): SocketServer | null;
export declare function initializeSocket(server: HTTPServer): SocketServer;
export {};
//# sourceMappingURL=index.d.ts.map