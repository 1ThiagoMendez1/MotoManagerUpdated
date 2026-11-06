#!/usr/bin/env python3
"""Restore only the previous web version while keeping the migrated database/API."""
import pathlib,json,subprocess,time,datetime,yaml
B=pathlib.Path('/opt/motomanager-production')
STATE=B/'migration-state.json'
ROUTER=pathlib.Path('/etc/dokploy/traefik/dynamic/motomanager-production.yml')
OLD='motomanager-motomanagersystem-yfexkv'
state=json.loads(STATE.read_text())
assert state.get('traffic_switched') and state.get('primary')=='new_postgresql17','This helper is only for a completed cutover'
subprocess.run(['docker','service','scale',OLD+'=1'],check=True,capture_output=True)
for _ in range(45):
 names=subprocess.check_output(['docker','ps','--filter','name='+OLD+'.1.','--format','{{.Names}}'],text=True).splitlines()
 if names:
  probe=subprocess.run(['docker','exec',names[0],'node','-e',"fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],capture_output=True)
  if probe.returncode==0:break
 time.sleep(2)
else:raise RuntimeError('Previous web did not become healthy; routing kept unchanged')
cfg=yaml.safe_load(ROUTER.read_text())
assert cfg['http']['services']['mm-production-api-backend']['loadBalancer']['servers'][0]['url']=='http://motomanager-production-gateway:8000'
(B/'router-before-web-rollback.yml').write_text(ROUTER.read_text())
cfg['http']['services']['mm-production-web-backend']['loadBalancer']['servers']=[{'url':'http://'+OLD+':3000'}]
tmp=ROUTER.with_suffix('.yml.tmp');tmp.write_text(yaml.safe_dump(cfg,sort_keys=False));tmp.replace(ROUTER)
state.update(web_fallback=True,web_fallback_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
STATE.write_text(json.dumps(state,indent=2))
print('Previous web activated; production continues using the migrated database and API.')
