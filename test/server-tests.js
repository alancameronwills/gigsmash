/*
Run tests on windows with: cd gigsmash; npm --test

*/

const service = "http://localhost:7000";

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs/promises');

async function stop(t) {
    let r = await fetch(`${service}/stopserver`).then(t => t.text());
    assert(r.startsWith("Stopped"), "no stop");
}

test('server tests', async (t) => {
    try {
        await t.test('ping', async (t) => {
            let r = await fetch(`${service}/ping`).then(t => t.text());
            assert(r.startsWith("pong"), "no pong");
        });
        await t.test('return file', async (t) => {
            let f = { name: "__test1.txt", content: "Test text" };
            await fs.writeFile(`./client/${f.name}`, f.content);
            try {
                let retrieved = await fetch(`${service}/${f.name}`).then(t => t.text());
                assert(f.content == retrieved, `Texts different: ${retrieved}`);
            } finally {
                await fs.unlink(`./client/${f.name}`);
            }
        })

        await t.test('execute file', async (t) => {
            let f = { name: "__test1", content: [{ a: 'a0', b: 'b0' }, { a: 'a1', b: 'b1' }] };
            await fs.mkdir(`.\\api\\${f.name}`);
            await fs.writeFile(`.\\api\\${f.name}\\index.js`, `module.exports = 
            async function (context, req) {
                let testObject = ${JSON.stringify(f.content)};
                testObject.push(req?.query?.parameter);
                context.res = {
                    body: JSON.stringify(testObject),
                    headers: { "Content-Type": "application/json" },
                    status: 200
                };
            }
            `);
            try {
                let pvalue = 42;
                let retrieved = await fetch(`${service}/api/${f.name}?parameter=${pvalue}`).then(t => t.json());
                f.content.push(pvalue);
                assert.deepEqual(retrieved, f.content);
            } finally {
                await fs.rm(`./api/${f.name}`, {recursive:true,force:true});
            }
        });
    } catch (e) {

    } finally {
        await t.test(stop);
    }
})