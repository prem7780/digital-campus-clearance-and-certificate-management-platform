let csrfToken = null
export async function api(path, options={}) {
  const method=(options.method||'GET').toUpperCase()
  if(!['GET','HEAD','OPTIONS'].includes(method)&&!csrfToken){const r=await fetch('/api/public/csrf',{credentials:'same-origin'});if(!r.ok)throw Error('Cannot initialize security token');csrfToken=(await r.json()).token}
  let init={method,credentials:'same-origin',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(!['GET','HEAD','OPTIONS'].includes(method)?{'X-XSRF-TOKEN':csrfToken}:{}),...((options.userActivity||(!['GET','HEAD','OPTIONS'].includes(method)&&!path.startsWith('/auth/login')))?{'X-User-Activity':'1'}:{}),...options.headers}}
  if(options.body!==undefined)init.body=JSON.stringify(options.body)
  let res=await fetch('/api'+path,init)
  if(!res.ok){let m='Request failed';try{const json=await res.json();m=json.error||json.detail||json.message||m}catch{};
    if(res.status===401&&!path.startsWith('/auth/login')&&!path.startsWith('/auth/me')&&!path.startsWith('/student/')&&!path.startsWith('/public/')){
      window.dispatchEvent(new CustomEvent('dccmp-session-expired',{detail:m}));
    }
    const error=new Error(m);error.status=res.status;throw error}
  const type=res.headers.get('content-type')||''
  return (type.includes('application/pdf')||type.includes('spreadsheetml')||type.includes('application/octet-stream'))?res.blob():type.includes('json')?res.json():res.text()
}
export async function downloadPdf(path,filename){const blob=await api(path);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
