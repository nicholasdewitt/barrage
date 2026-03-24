import { Tooltip, ActionIcon, Menu, Box } from "@mantine/core";
import { IconDroplet } from "@tabler/icons";
import React from "react";
import { trpc } from "../utils/trpc";

const GoToDeluge = () => {

const delugeURL = trpc.deluge.getDelugeURL.useQuery(undefined, {
  staleTime: Infinity,
}); 

const goToDeluge = () => {
  window.open(delugeURL.data?.toString(), '_blank')
}

  return (

        <Tooltip
          withinPortal
          label="Go To Deluge"
          position="bottom"
          withArrow
          color={"blue"}
        >
          <ActionIcon
            radius={"sm"}
            ml={"md"}
            sx={(theme) => ({
              borderWidth: 1,
              borderColor: theme.colors.blue,
            })}
            variant="light"
            color={"blue"}
            size={"xl"}
            onClick={goToDeluge}
          >
            <IconDroplet />
          </ActionIcon>
        </Tooltip>
  );
};
export default GoToDeluge;
