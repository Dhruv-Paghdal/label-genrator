const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const bodyParser = require('body-parser');
const fs = require('fs');
const express = require('express');
const { engine } = require('express-handlebars');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

const puppeteerOptions = {
    headless: true,
    executablePath: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
};

app.get('/', (req, res) => {
    res.render('main', {layout: "default"});
});

app.post("/print", async(req, res)=> {
    try {
        const options = {
            "station": req.body.station,
            "quality": req.body.quality,
            "season": req.body.season,
            "partyMark": req.body.partyMark,
            "lotNumber": req.body.lotNumber,
            "prNumber": {
                "value": req.body.prNumber,
                "autoIncrement": req.body.prNumberAutoIncrement
            },
            "balesNumber": {
                "value": req.body.balesNumber,
                "autoIncrement": req.body.balesNumberAutoIncrement
            },
            "lableQuantity": req.body.lableQuantity
        }
        let lableAry = [];
        let lablePortion = [];
        let finalLableAry = [];
        let autoPR, autoBales = 0;
        if (options.prNumber.autoIncrement) {
            autoPR = 1;
        }
        if (options.balesNumber.autoIncrement) {
            autoBales = 1;
        }
        for (let index = 0; index < parseInt(options.lableQuantity); index++) {
            lableAry.push({
                "station": options.station,
                "quality": options.quality,
                "season": options.season,
                "partyMark": "",
                "lotNumber": options.lotNumber,
                "prNumber": (autoPR ? parseInt(options.prNumber.value) + index : parseInt(options.prNumber.value)),
                "balesNumber": (autoBales ? parseInt(options.balesNumber.value) + index : parseInt(options.balesNumber.value)),
            })
    
        }
        for (let i = 0; i < options.lableQuantity; i += 4) {
            const portion = lableAry.slice(i, i + 4);
            lablePortion.push(portion);
        }
        for (const lable of lablePortion) {
            if(lable.length == 4){
                finalLableAry.push([[lable[0], lable[1]], [lable[2], lable[3]]]);     
              } else if(lable.length == 3){
                finalLableAry.push([[lable[0], lable[1]], [lable[2]]]);     
              } else if(lable.length == 2){
                finalLableAry.push([[lable[0], lable[1]]]);     
              } else {
                lable[0].singleOrder = true;
                finalLableAry.push([lable]);
              }
        }
    
        const browser = await puppeteer.launch(puppeteerOptions);
        const page = await browser.newPage();
        const labelHtml = fs.readFileSync('label_template.html', 'utf8');
        const template = handlebars.compile(labelHtml);
        const html = template(finalLableAry);
        await page.setContent(html, {
            waitUntil: ['domcontentloaded', 'networkidle0', 'load']
        })
        const pdfBuffer = await page.pdf({
            format: 'A4',
        });
        res.setHeader("Content-Disposition", `attachment; filename=Label.pdf`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.set("Content-Type", "application/pdf");
        await browser.close();
        res.send(pdfBuffer);
    } catch (error) {
        console.log("Something went wrong");
        console.log(error);
    }      
})

app.listen(3000, ()=>{
    console.log("App running on http://localhost:3000");
});




