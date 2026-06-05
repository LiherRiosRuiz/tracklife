# Hosts y DNS

Los dominios `.test` se resuelven via archivo hosts, no DNS real.

## Configuracion

Anadir en `C:\Windows\System32\drivers\etc\hosts` de cada maquina de la red:

```
192.168.20.123  web1.test web2.test web3.test api.test traefik.test portainer.test
```

## Como funciona

1. El navegador resuelve `web1.test` a `192.168.20.123` (via hosts)
2. La peticion llega al puerto 80 del servidor
3. Windows portproxy (netsh) redirige al puerto 80 de WSL2
4. [[Traefik]] lee el header `Host:` y enruta al contenedor correcto

## Port forwarding WSL2

WSL2 tiene su propia IP interna. Para que el trafico de la LAN llegue a los
contenedores, hay un script de port forwarding:

```
infra/scripts/wsl-portforward.ps1
```

Puertos reenviados: 80 (Traefik), 8080 (dashboard), 9100 (Portainer).

## Pendiente

- Automatizar portproxy con Task Scheduler (la IP de WSL2 cambia en cada reinicio)
- Certificados SSL si se abre a internet

---

Ver tambien: [[Traefik]], [[Arquitectura Docker]], [[Pendientes]]
