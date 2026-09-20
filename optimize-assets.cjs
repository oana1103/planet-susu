const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
let html=fs.readFileSync('index.html','utf8'),before=0,after=0;
for(const dir of ['cover','love-backgrounds','love-illustrations','menu-planets','camera']){
  for(const file of fs.readdirSync('assets/'+dir)){
    if(!/\.(png|jpg|jpeg)$/i.test(file))continue;
    const source='assets/'+dir+'/'+file;
    if(!html.includes('./'+source))continue;
    const target=source.replace(/\.(png|jpg|jpeg)$/i,'.webp');
    execFileSync('cwebp',['-quiet','-q','82','-m','6',source,'-o',target]);
    before+=fs.statSync(source).size;after+=fs.statSync(target).size;
    html=html.split('./'+source).join('./'+target);
  }
}
html=html.replace(/<img\b([^>]*?)src="([^"]+)"([^>]*?)>/g,(whole,a,src,b)=>whole.includes('cover-illustration')?whole:whole.replace('src="'+src+'"','loading="lazy" decoding="async" src="'+src+'"'));
fs.writeFileSync('index.html',html);
console.log(JSON.stringify({imageBytesBefore:before,imageBytesAfter:after}));
