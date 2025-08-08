import {promises as fs} from "fs";
import axios from "axios";

async function readJSONfile(datapath){
    return await fs.readFile(datapath, "utf8");
}

async function writeJSONfile(datapath, data){
    return await fs.writeFile(datapath, data);
}

async function getJSON(url){
    return await axios.get(url);
}

export { readJSONfile, writeJSONfile, getJSON}