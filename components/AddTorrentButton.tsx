import {
  Menu,
  Text,
  Tooltip,
  ActionIcon,
  Modal,
  Box,
  Loader,
  Space,
  TextInput,
  Button,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { IconPlus, IconMagnet, IconLink, IconFile } from "@tabler/icons";
import React, { useEffect, useState } from "react";
import { ConfigValues } from "../deluge";
import useTorrentStore from "../stores/useTorrentStore";
import { trpc } from "../utils/trpc";
import AddTorrentModal from "./AddTorrentModal";

const AddTorrentButton = () => {
  const [openedMagnet, setOpenedMagnet] = useState(false);
  const [openedURL, setOpenedURL] = useState(false);
  const [openedFile, setOpenedFile] = useState(false);
  const v2 = useTorrentStore((s) => s.isv2);

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
  const [magnet, setMagnet] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState("");
  const [fileName, setFileName] = useState("");
  const [magnetError, setMagnetError] = useState("");
  const [urlError, setURLError] = useState("");
  const [fileError, setFileError] = useState("");
  const [debouncedURL] = useDebouncedValue(url, 200);

  const addMagnet = trpc.deluge.addMagnet.useMutation();

  const addTorrent = trpc.deluge.addTorrent.useMutation();

  const magnetinfo = trpc.deluge.magnetInfo.useQuery(
    { magnet: magnet },
    {
      enabled: !!magnet,
      onError(err) {
        setMagnetError(err.message);
      },
    }
  );

  const getInfo = trpc.deluge.getTorrentInfo.useMutation({
    onError(error, variables, context) {
      setURLError(error.message);
    },
  });

  const downloadURL = trpc.deluge.downloadURL.useMutation({
    onSuccess(data, variables, context) {
      getInfo.mutate({ path: data });
    },
    onError(error, variables, context) {
      setURLError("Invalid URL");
    },
  });

  const config = trpc.deluge.configValue.useQuery(
    { v2: v2 },
    {
      enabled: false,
    }
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openedMagnet || openedURL || openedFile) {
      config.refetch();
    }
    if (!openedMagnet) {
      setMagnet("");
      setMagnetError("");
    }
    if (!openedURL) {
      setURLError("");
      setUrl("");
    }
    if (!openedFile) {
      setFile("");
      setFileName("");
      setFileError("");
    }
  }, [openedMagnet, openedURL, openedFile]);

  useEffect(() => {
    if (config.data) {
      form.setValues(config.data);
    }
  }, [config.data]);

  useEffect(() => {
    if (debouncedURL) {
      downloadURL.mutate({ url: debouncedURL });
    }
  }, [debouncedURL]);

  const context = trpc.useContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const content = readerEvent.target?.result;
        if (typeof content === "string") {
          const base64Content = content.split(",")[1];
          setFile(base64Content);
          setOpenedFile(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".torrent"
        onChange={handleFileChange}
      />
      <Modal
        opened={openedFile}
        onClose={() => setOpenedFile(false)}
        title="Add Torrent from File"
      >
        <Box mx={"auto"}>
          <Text weight="bold" size="sm" mb="xs">
            File: {fileName}
          </Text>
          <AddTorrentModal form={form} />
          <Space h={"md"} />
          <Group position="right">
            <Button
              type="submit"
              onClick={() => {
                addTorrent.mutate({
                  path: file,
                  config: form.values,
                });
                setOpenedFile(false);
              }}
              disabled={!file}
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
      </Modal>
      <Modal
        opened={openedMagnet}
        onClose={() => setOpenedMagnet(false)}
        title="Add Torrents"
      >
        <Box mx={"auto"}>
          <TextInput
            placeholder="Magnet URL"
            label="Enter Magnet URL"
            error={magnetError}
            onInput={(e) => {
              context.deluge.magnetInfo.cancel();
              setMagnetError("");
              setMagnet(e.currentTarget.value);
            }}
            value={magnet}
            withAsterisk
            required
            rightSection={magnetinfo.isFetching && <Loader size={"xs"} />}
          />
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
              onClick={() => {
                addMagnet.mutate({ magnet, config: form.values });
                setOpenedMagnet(false);
              }}
              disabled={!magnet || magnetError != ""}
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
      </Modal>
      <Modal
        opened={openedURL}
        onClose={() => setOpenedURL(false)}
        title="Add Torrents"
      >
        <Box mx={"auto"}>
          <TextInput
            placeholder="URL"
            label="Enter URL"
            error={urlError}
            onInput={(e) => {
              setURLError("");
              setUrl(e.currentTarget.value);
            }}
            value={url}
            withAsterisk
            required
            rightSection={
              (getInfo.isLoading || downloadURL.isLoading) && (
                <Loader size={"xs"} />
              )
            }
          />
          <Space h={"xs"} />
          {getInfo.data && (
            <Text color={"dimmed"} weight="bold" size="xs">
              {getInfo.data?.result.name}
            </Text>
          )}
          <Space h={"md"} />
          <AddTorrentModal form={form} />
          <Space h={"md"} />
          <Group position="right">
            <Button
              type="submit"
              onClick={() => {
                addTorrent.mutate({
                  path: downloadURL.data!,
                  config: form.values,
                });

                setOpenedURL(false);
              }}
              disabled={!getInfo.data?.result || urlError != ""}
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
      </Modal>
      <Menu
        shadow="md"
        width={200}
        withinPortal
        closeOnClickOutside
        closeOnEscape
        withArrow
        position="bottom-start"
      >
        <Menu.Target>
          <Tooltip
            withinPortal
            label="Add"
            position="bottom"
            zIndex={300}
            withArrow
            color={"blue"}
          >
            <ActionIcon
              radius={"sm"}
              sx={(theme) => ({
                borderWidth: 1,
                borderColor: theme.colors.blue,
              })}
              mr={"md"}
              variant="light"
              color={"blue"}
              size={"xl"}
            >
              <IconPlus />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Add Torrent</Menu.Label>
          <Menu.Item
            onClick={() => fileInputRef.current?.click()}
            icon={<IconFile size={14} />}
          >
            File
          </Menu.Item>
          <Menu.Item
            onClick={() => setOpenedMagnet(true)}
            icon={<IconMagnet size={14} />}
          >
            Magnet
          </Menu.Item>
          <Menu.Item
            onClick={() => setOpenedURL(true)}
            icon={<IconLink size={14} />}
          >
            Add from URL
          </Menu.Item>
          {/* <Menu.Item icon={<IconLink size={14} />}>URL</Menu.Item>
          <Menu.Item icon={<IconFile size={14} />}>File</Menu.Item> */}
        </Menu.Dropdown>
      </Menu>
    </>
  );
};

export default AddTorrentButton;
