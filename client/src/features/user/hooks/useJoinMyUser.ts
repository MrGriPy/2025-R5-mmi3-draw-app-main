import { useEffect } from "react";
import { useMyUserStore } from "../store/useMyUserStore";
import { createMyUser } from "../utils/create-my-user";
import { SocketManager } from "../../../shared/services/SocketManager";
import { useSocketStore } from "../../../shared/store/useSocketStore";

export const useJoinMyUser = () => {
  const { setMyUser } = useMyUserStore();
  const { isConnectedToServer } = useSocketStore();
  console.log('useJoinMyUser hook initialized', { isConnectedToServer });

  useEffect(() => {
    console.log('Setting up listener for myUser:joined');
    SocketManager.listen("myUser:joined", (data) => {
      console.log('Received myUser:joined', data);
      setMyUser(data.user);
    });

    /*return () => {
      console.log('Cleaning up listener for myUser:joined');
      SocketManager.off("myUser:joined");
    }*/
  }, [setMyUser]);


  const joinMyUser = () => {
    if (isConnectedToServer) {
      SocketManager.emit("myUser:join", createMyUser() );
    }
  }
  
  return { joinMyUser };
}