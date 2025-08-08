import express from "express";
import { readJSONfile, writeJSONfile } from "./data.js";

let app = express();
app.use(express.json());


app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ error: "Invalid JSON input" });
    }
    next(err);
});


app.get("/getproducts", async (req, res) => {
    try {
        let readfile = await readJSONfile("./products.json");
        res.setHeader('Content-Type', 'application/json; charset=utf-8'); 
        res.end(readfile);
        console.log(readfile);
    } catch (err) {
        console.log("Error catched: Get product fail.");
        console.log(err);
    }
});


app.get("/products/:productId", async (req, res) => {
    try {
        let readfile = await readJSONfile("./products.json");
        let jsonOBJ = JSON.parse(readfile).filter((item) =>
            item.productId === parseInt(req.params.productId)); 
        res.setHeader('Content-Type', 'application/json; charset=utf-8'); 
        res.end(JSON.stringify(jsonOBJ)); 
        console.log(JSON.stringify(jsonOBJ));
    } catch (err) {
        console.log("捕获到错误：获取产品失败。");
        console.log(err);
        res.status(500).json({ error: "内部服务器错误" });
    }
});


app.post("/addproduct", async (req, res) => {
    try {
        let readfile = await readJSONfile("./products.json");
        let jsonOBJ = JSON.parse(readfile);
        let inputData = req.body;
        jsonOBJ.push(inputData);
        console.log(jsonOBJ);
        await writeJSONfile("./products.json", JSON.stringify(jsonOBJ));
        res.setHeader('Content-Type', 'application/json; charset=utf-8'); 
        res.status(201).send(JSON.stringify(jsonOBJ));
    } catch (err) {
        res.status(400).json({ "err": "Error catch: Add product fail." });
        console.log("Error catched: Add product fail.");
        console.log(err);
    }
});


app.put("/editproduct/:productId", async (req, res) => {
    try {
        let readfile = await readJSONfile("./products.json");

        if (!readfile) {
            return res.status(500).json({ error: "无法读取产品数据" });
        }

        let jsonOBJ = JSON.parse(readfile);

        if (!Array.isArray(jsonOBJ)) {
            return res.status(500).json({ error: "数据格式错误" });
        }

        let productOBJidx = jsonOBJ.findIndex((item) => item.productId === parseInt(req.params.productId));

        if (productOBJidx !== -1) {
            jsonOBJ[productOBJidx] = { ...jsonOBJ[productOBJidx], ...req.body };
            await writeJSONfile("./products.json", JSON.stringify(jsonOBJ));
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(200).send(JSON.stringify(jsonOBJ[productOBJidx])); 
        } else {
            return res.status(404).json({ error: "产品未找到" }); 
        }
    } catch (err) {
        res.status(500).json({ error: "编辑产品失败" });
        console.log("捕获到错误：编辑产品失败。");
        console.log(err);
    }
});

app.delete("/delproduct/:productId", async (req, res) => {
    try {
        let readfile = await readJSONfile("./products.json");
        let jsonOBJ = JSON.parse(readfile);
        let productIdx = jsonOBJ.findIndex((item) => item.productId == req.params.productId);
        if (productIdx != -1) {
            jsonOBJ.splice(productIdx, 1);
            await writeJSONfile("./products.json", JSON.stringify(jsonOBJ));
            res.setHeader('Content-Type', 'application/json; charset=utf-8'); 
            res.end(JSON.stringify(jsonOBJ));
            console.log(JSON.stringify(jsonOBJ));
        } else {
            throw new Error("Error catched: Invalid product id.");
        }
    } catch (err) {
        console.log("Error catched: Edit product fail.");
        console.log(err);
    }
});


let server = app.listen(8080, () => {
    let host = server.address().address;
    let port = server.address().port;
    console.log("Restful Api Server start...");
    console.log(`Please visit the website http://${host}:${port}`);
});