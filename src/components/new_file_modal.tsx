import React, { useState } from 'react';

import { Box, Button, FormControl, FormHelperText, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useRadio, useRadioGroup } from "@chakra-ui/react"
import { HTML_DOCUMENT, SplootHtmlDocument } from '../language/types/html/html_document';
import { JavascriptFile, JAVASCRIPT_FILE } from '../language/types/js/javascript_file';
import { SplootNode } from '../language/node';
import { generateScope } from '../language/scope/scope';
import { DATA_SHEET, SplootDataSheet } from '../language/types/dataset/datasheet';


const fileExtension = {
  HTML_DOCUMENT: '.html',
  JAVASCRIPT_FILE: '.js',
  DATA_SHEET: '.sheet',
}

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  addCodeFile: (name: string, type: string, rootNode: SplootNode) => void;
}

export function NewFileModal(props: NewFileModalProps) {
  let { isOpen, onClose, addCodeFile} = props;

  let [fileType, setFileType] = useState(HTML_DOCUMENT);
  let [fileName, setFileName] = useState('newfile' + fileExtension[HTML_DOCUMENT]);

  const { getRootProps, getRadioProps, setValue } = useRadioGroup({
    name: "type",
    defaultValue: HTML_DOCUMENT,
    onChange: (value) => {
      let ext = fileExtension[value];
      if (!fileName.endsWith(ext)) {
        let idx = fileName.indexOf('.');
        if (idx !== -1) {
          setFileName(fileName.slice(0, idx) + ext);
        } else {
          setFileName(fileName + ext);
        }
      }
      setFileType(value as string);
    },
  })
  const group = getRootProps()

  const handleLoad = async (event) => {
    let rootNode : SplootNode = null;
    if (fileType === HTML_DOCUMENT) {
      rootNode = new SplootHtmlDocument(null);
    } else if (fileType == JAVASCRIPT_FILE) {
      rootNode = new JavascriptFile(null);
      generateScope(rootNode);
      rootNode.recursivelySetMutations(true);
    } else if (fileType == DATA_SHEET) {
      rootNode = new SplootDataSheet(null);
    }
    addCodeFile(fileName, fileType, rootNode);
    onClose();
  };

  let valid = fileName.endsWith(fileExtension[fileType]);
  const inputRef = React.useRef()

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size='xl' initialFocusRef={inputRef}>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>New file</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
          <FormControl id="filename">
            <Input placeholder="name" ref={inputRef} onChange={(event) => {
              let name = event.target.value;
              for (let type in fileExtension) {
                if (name.endsWith(fileExtension[type])) {
                  setValue(type);
                  setFileType(type);
                }
              }
              setFileName(name);
            }} value={fileName}/>
            <FormHelperText></FormHelperText>
          </FormControl>
          <HStack {...group}>
            {/*
              // @ts-ignore */}
            <RadioCard key={HTML_DOCUMENT} {...getRadioProps({value: HTML_DOCUMENT})}>
              HTML
            </RadioCard>
            {/*
              // @ts-ignore */}
            <RadioCard key={JAVASCRIPT_FILE} {...getRadioProps({value: JAVASCRIPT_FILE})}>
              JavaScript 
            </RadioCard>
            {/*
              // @ts-ignore */}
            <RadioCard key={DATA_SHEET} {...getRadioProps({value: DATA_SHEET})}>
              Data Spreadsheet
            </RadioCard>
          </HStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={3}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleLoad} disabled={!valid}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

function RadioCard(props) {
  const { getInputProps, getCheckboxProps } = useRadio(props)

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="md"
        boxShadow="md"
        _checked={{
          bg: "whiteAlpha.300",
          color: "white",
          borderColor: "blue.300",
        }}
        _focus={{
          boxShadow: "outline",
        }}
        px={3}
        py={1}
      >
        {props.children}
      </Box>
    </Box>
  )
}
