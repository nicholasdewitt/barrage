import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Space,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconFilter, IconSearch, IconMagnet, IconSortDescending, IconSettings } from "@tabler/icons";
import { Column, Table } from "@tanstack/react-table";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useMemo } from "react";
import { ConfigValues, NormalizedTorrent } from "../deluge";
import { router } from "../server/trpc";
import useTableStore from "../stores/useTableStore";
import useTorrentStore from "../stores/useTorrentStore";
import { trpc } from "../utils/trpc";
import AddTorrentButton from "./AddTorrentButton";
import Filter from "./Filter";
import MemoizedSort from "./Sort";
import Sort from "./Sort";
import Statusbar from "./Statusbar";
import TorrentOptionForm from "./TorrentOptionForm";
import GoToDeluge from "./GoToDeluge";
import { useForm } from "@mantine/form";
import AddTorrentModal from "./AddTorrentModal";



const NavBar = () => {
  const router = useRouter();
  const theme = useMantineTheme();
  const setFilter = useTableStore((s) => s.setFilter);
  const filter = useTableStore((s) => s.filter);
  const [value, setValue] = useState<string>(
    (filter.find((s) => s.id === "name")?.value as string) || ""
  );
  const [debounced] = useDebouncedValue(value, 200);

  const info = trpc.deluge.getHostInfo.useMutation();
  const setIsv2 = useTorrentStore((s) => s.setIsv2);
  const v2 = useTorrentStore((s) => s.isv2);
  const addMagnet = trpc.deluge.addMagnet.useMutation();
    const magnetinfo = trpc.deluge.magnetInfo.useQuery(
      { magnet: value },
      {
        enabled: !!value,
      }
    );

  const form = useForm<ConfigValues>({
    initialValues: {
      add_paused: false,
      compact_allocation: undefined,
      download_location: "",
      max_connections_per_torrent: -1,
      max_download_speed_per_torrent: -1,
      move_completed: false,
      move_completed_path: "",
      max_upload_slots_per_torrent: -1,
      max_upload_speed_per_torrent: -1,
      prioritize_first_last_pieces: false,
      pre_allocate_storage: undefined,
      sequential_download: undefined,
      super_seeding: undefined,
    },
  });

  const config = trpc.deluge.configValue.useQuery(
    { v2: v2 },
    {
      enabled: false,
    }
  );  

  const startMagnetDownload = ()=> {
    addMagnet.mutate({ magnet: value, config: form.values });
    setValue("");
  }

  const handleKeyPress = (event: { key: string; }) =>{
    console.log(value)
    if(event.key === "Enter" && value.toLowerCase().startsWith("magnet:")){
      startMagnetDownload();
    } 
  }
  


  useEffect(() => {
    info.mutate();
  }, []);

  useEffect(() => {
    if (info.data) {
      const isv2 = info.data[0] === "2";
      console.log(isv2);
      setIsv2(isv2);
    }
  }, [info.data]);

  useEffect(() => {
    setFilter((old) => [
      ...old.filter((s) => s.id != "name"),
      {
        id: "name",
        value: debounced,
      },
    ]);
  }, [debounced]);

  useEffect(() => {
      if (config.data) {
        form.setValues(config.data);
      }
    }, [config.data]);


  return (
    <Card
      sx={{
        overflow: "unset",
      }}
      radius={0}
      shadow={"lg"}
      withBorder
    >
      <Card.Section>
        <Statusbar />
      </Card.Section>

      <Card.Section
  p="md"
  sx={{
    display: "flex",
    flexDirection: "column",
  }}
>
  <Box sx={{ display: "flex" }}>
    <AddTorrentButton />
    <TextInput
          size="md"
          value={value}
          sx={{
            flexGrow: 1,
            alignSelf: "center",
          }}
          onChange={(event) => setValue(event.currentTarget.value)}
          styles={{ input: { background: theme.colors.dark[8] } }}
          placeholder="Search Torrents or Paste Magnet URL"
          icon={value.toLowerCase().startsWith("magnet:") ? <IconMagnet /> : <IconSearch />}
          onKeyDown={handleKeyPress}
        />
    <Sort />
    <Filter />
    <GoToDeluge />
  </Box>

  {value.toLowerCase().startsWith("magnet:") && (
    <Box pt="md">
          <Space h={"xs"} />
          {magnetinfo.data && (
            <Text color={"dimmed"} weight="bold" size="xs">
              {magnetinfo.data?.name}
            </Text>
          )}
          <Space h={"md"} />
          <AddTorrentModal form={form} />
          <Space h={"md"} />
          <Group position="right">
            <Button
              type="submit"
              onClick={startMagnetDownload}
              disabled={!value}
              variant="light"
              color={"blue"}
              sx={(theme) => ({
                borderWidth: 1,
                borderColor: theme.colors.blue,
              })}
            >
              Add
            </Button>
          </Group>
        </Box>
  )}
</Card.Section>
    </Card>
  );
};
export default NavBar;
