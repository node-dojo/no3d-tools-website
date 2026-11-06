// Lossless: store each pose's UInt16 differences, then group low/high bytes
// so HTTP gzip can compress the mostly stationary parts of the book.
export function encodePoses(data,parts,count){
  const output=new Uint8Array(data.length*2),plane=data.length;let offset=0;
  for(const part of parts){
    const stride=part.vertexCount*3;
    for(let sample=0;sample<count;sample++)for(let j=0;j<stride;j++){
      const i=offset+sample*stride+j,value=(data[i]-(sample?data[i-stride]:0))&65535;
      output[i]=value&255;output[i+plane]=value>>>8;
    }
    offset+=count*stride;
  }
  return output;
}
export function decodePoses(buffer,parts,count){
  const input=new Uint8Array(buffer),output=new Uint16Array(buffer.byteLength/2),plane=output.length;let offset=0;
  for(const part of parts){
    const stride=part.vertexCount*3;
    for(let sample=0;sample<count;sample++)for(let j=0;j<stride;j++){
      const i=offset+sample*stride+j,value=input[i]|input[i+plane]<<8;
      output[i]=value+(sample?output[i-stride]:0);
    }
    offset+=count*stride;
  }
  return output;
}
