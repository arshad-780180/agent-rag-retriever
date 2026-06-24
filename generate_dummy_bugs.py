import os
import random

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

base_dir = "qa_dummy_bugs"
difficulties = ["easy", "medium", "hard"]

for d in difficulties:
    ensure_dir(os.path.join(base_dir, d))

easy_templates = [
    "// Easy Bug {i}\nconsole.log('Loading config...');\nthrow new TypeError(\"Cannot read properties of undefined (reading 'config')\");",
    "// Easy Bug {i}\nfunction init() {{ throw new SyntaxError(\"Unexpected token '<'\"); }}\ninit();",
    "// Easy Bug {i}\nconst data = null;\nconsole.log(data.length);",
    "// Easy Bug {i}\nthrow new ReferenceError(\"process is not defined\");",
]

medium_templates = [
    "// Medium Bug {i}\nconst arr = new Array(-1);",
    "// Medium Bug {i}\nfunction loop() {{ loop(); }}\nloop();",
    "// Medium Bug {i}\nthrow new RangeError(\"Invalid string length\");",
    "// Medium Bug {i}\nconst obj = {{}};\nObject.defineProperty(obj, 'prop', {{ value: 42, writable: false }});\nobj.prop = 43;",
    "// Medium Bug {i}\nPromise.reject(new Error(\"Unhandled promise rejection: database timeout\"));\nsetTimeout(() => {{}}, 100);"
]

hard_templates = [
    "// Hard Bug {i}\nconst EventEmitter = require('events');\nclass MyEmitter extends EventEmitter {{}}\nconst myEmitter = new MyEmitter();\nmyEmitter.emit('error', new Error('EADDRINUSE: address already in use :::8080'));",
    "// Hard Bug {i}\nsetTimeout(() => {{ throw new Error(\"Segmentation fault (core dumped)\"); }}, 50);",
    "// Hard Bug {i}\nasync function fetch() {{ throw new Error(\"ECONNRESET: socket hang up\"); }}\nfetch().then(() => {{}});",
    "// Hard Bug {i}\nthrow new Error(\"FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory\");"
]

def generate_files(difficulty, templates, count):
    dir_path = os.path.join(base_dir, difficulty)
    for i in range(1, count + 1):
        template = random.choice(templates).format(i=i)
        filename = f"bug_{i}.js"
        with open(os.path.join(dir_path, filename), "w") as f:
            f.write(template)

generate_files("easy", easy_templates, 20)
generate_files("medium", medium_templates, 20)
generate_files("hard", hard_templates, 20)

print("Generated 60 dummy bug files.")
