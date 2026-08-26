const fs = require('fs');
const path = 'src/lib/data.ts';
let code = fs.readFileSync(path, 'utf8');

const returnStr = `    })) : []
  };`;
  
if (code.includes(returnStr)) {
    code = code.replace(returnStr, `    })) : [],
    depositAmount: parsedDeposit,
    depositHistory: depositHistory
  };`);
    fs.writeFileSync(path, code);
    console.log('patched data.ts successfully');
} else {
    console.log('returnStr not found');
}
