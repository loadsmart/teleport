# Teleport Connect

Teleport Connect (previously Teleport Terminal, package name `teleterm`) is a desktop application that allows easy access to Teleport resources.

## Usage

Please refer to [the _Using Teleport Connect_ page from our
docs](https://goteleport.com/docs/connect-your-client/teleport-connect/).

## Building and packaging

Teleport Connect consists of two main components: the `tsh` tool and the Electron app.

To get started, first we need to build `tsh`.

```bash
cd teleport
make build/tsh
```

The build output can be found in the `build` directory. The tsh binary will be packed together with
the Electron app.

Next, we're going to build the Electron app.

```bash
cd teleport
pnpm install
pnpm build-term && CONNECT_TSH_BIN_PATH=$PWD/build/tsh pnpm package-term
```

The resulting package can be found at `web/packages/teleterm/build/release`.

For more details on how Connect is built for different platforms, see the [Build
process](#build-process) section.

## Development

```sh
cd teleport
pnpm install && make build/tsh
```

The app depends on Rust WASM code. To compile it, the following tools have to be installed:
* `Rust` and `Cargo`. The required version is specified by `RUST_VERSION` in [build.assets/Makefile](https://github.com/gravitational/teleport/blob/master/build.assets/versions.mk#L11).
* [`wasm-pack`](https://github.com/rustwasm/wasm-pack). The required version is specified by `WASM_PACK_VERSION` in [build.assets/Makefile](https://github.com/gravitational/teleport/blob/master/build.assets/versions.mk#L12).
* [`binaryen`](https://github.com/WebAssembly/binaryen) which contains `wasm-opt`. This is required on on linux aarch64 (64-bit ARM).
  You can check if it's already installed on your system by running `which wasm-opt`. If not you can install it like `apt-get install binaryen` (for Debian-based Linux). `wasm-pack` will install this automatically on other platforms.

To automatically install `wasm-pack`, run the following command:
```shell
make ensure-wasm-deps
```

To launch `teleterm` in development mode:

```sh
cd teleport
# By default, the dev version assumes that the tsh binary is at build/tsh.
pnpm start-term

# You can provide a different absolute path to the tsh binary though the CONNECT_TSH_BIN_PATH env var.
CONNECT_TSH_BIN_PATH=$PWD/build/tsh pnpm start-term
```

To automatically restart the app when tsh gets rebuilt or
[when the main process or preload scripts change](https://electron-vite.org/guide/hot-reloading),
use [watchexec](https://github.com/watchexec/watchexec):

```sh
watchexec --restart --watch build --filter tsh --no-project-ignore -- pnpm start-term -w
```

This can be combined with a tool like [gow](https://github.com/mitranim/gow) to automatically rebuild tsh:

```sh
gow -s -S '✅\n' -g make build/tsh
```

### Development-only tools

#### Browser console tools

The `teleterm` object defined on `window` contains the entirety of `AppContext`. This is useful for
debugging state of different `AppContext` services.

The `deepLinkLaunch` function defined on `window` allows you to launch a deep link from the browser
console. Normally this feature is reserved only for the packaged app since the OS has to recognize
Connect as the handler for the custom protocol and send the deep link event to the main process.
This function completely bypasses the interaction with the main process and sends the URL straight
to the frontend app.

### Generating tshd gRPC protobuf files

Rebuilding them is needed only if you change any of the files in `proto/teleport/lib/teleterm` dir.

To rebuild and update gRPC proto files:

```sh
make grpc
```

Resulting Go and JS files can be found in `gen/proto`.

### Generating shared process gRPC protobuf files

Run `generate-grpc-shared` script from `teleterm/package.json`.
It generates protobuf files from `*.proto` files in `sharedProcess/api/proto`.
Resulting files can be found in `sharedProcess/api/protogen`.

## Build process

`pnpm package-term` is responsible for packaging the app code for distribution.

On all platforms, with the exception of production builds on macOS, the `CONNECT_TSH_BIN_PATH` env
var is used to provide the path to the tsh binary that will be included in the package.

See [Teleport Connect build process](https://www.notion.so/goteleport/Teleport-Connect-build-process)
on Notion for build process documentation that is specific to Gravitational.

### Native dependencies

If node-pty doesn't provide precompiled binaries for your system and the specific Electron version,
you will need to install [the dependencies required by
node-pty](https://github.com/microsoft/node-pty#dependencies).

### Linux

To create arm64 deb and RPM packages you need to provide `USE_SYSTEM_FPM=1` env var.

### Windows

A lot of our tooling assumes that you're running sh-compatible shell with some standard tools like
`make` available. On Windows, that's available through Git Bash from [Git for Windows](https://gitforwindows.org/).
It also ships with a lot of GNU tools that are needed to build the project.

`make build/tsh` doesn't work on Windows anyway. But you can run a simplified version of what that
Make target calls underneath.

```
GOOS=windows CGO_ENABLED=1 go build -o build/tsh.exe  -ldflags '-w -s' -buildvcs=false ./tool/tsh
```

It's important for the executable to end with `.exe`. If that command doesn't work, you can always
inspect what we currently do in [our Windows build pipeline scripts](https://github.com/gravitational/teleport/blob/983017b23f65e49350615bfbbe52b7f1080ea7b9/build.assets/windows/build.ps1#L377).

#### Native dependencies on Windows

On Windows, you need to pay special attention to [the dev tools needed by node-pty](https://github.com/microsoft/node-pty?tab=readme-ov-file#windows),
especially the Spectre-mitigated libraries installed through Visual Studio Installer that are kind
of tricky to install. If you're on an arm64 VM of Windows, you'll likely need both arm64 and x64
versions of Spectre-mitigated libraries. This is because during `pnpm install` pnpm will try to
build arm64 version of node-pty (which will be used for `pnpm start-term`), and during `pnpm
package-term` it might attempt to compile x64 version of node-pty.

At the time of writing, we found the following set of individual components for Visual Studio 2022
to work with Connect build process:

- MSVC v143 - VS 2022 C++ ARM64/ARM64EC Spectre-mitigated libs (Latest)
- MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)

If you're on an actual Windows machine, you can install just the x64/x86 libs.

#### Packaging

##### VNet dependencies

Packaging Connect on Windows requires wintun.dll, which VNet uses to create a
virtual network interface.
A zip file containing the DLL can be downloaded from https://www.wintun.net/builds/wintun-0.14.1.zip
Extract the zip file and then pass the path to wintun.dll to `pnpm package-term`
with the `CONNECT_WINTUN_DLL_PATH` environment variable. By default, electron-builder builds an x64
version of the app, so you need amd64 version of the DLL.

Another DLL that's not required but one that makes logs in Event Viewer easier to read is
msgfile.dll. Refer to
[`lib/utils/log/eventlog/README.md`](/lib/utils/log/eventlog/README.md#message-file) for details on
how to generate it.

### macOS

To make a fully-fledged build on macOS with Touch ID support, you need two things:

- a signed version of tsh.app
- an Apple Developer ID certificate in your Keychain

When running `pnpm package-term`, you need to provide these environment variables:

- `APPLE_USERNAME`
- `APPLE_PASSWORD`
- `CONNECT_TSH_APP_PATH`
- `CSC_NAME` (optional, developer certificate ID)
- `TEAMID`

The details behind those vars are described below.

#### tsh.app

Unlike other platforms, macOS needs the whole tsh.app to be bundled with Connect, not just the tsh
binary. This is in order to support Touch ID and provide access to the same Secure Enclave keys.
That is, if you add Touch ID as MFA through tsh, we want tsh.app bundled with Connect to have access
to the same keys.

Since Connect piggybacks on tsh for authn, this amounts to just copying a signed & notarized version
of tsh.app into `Teleport Connect.app/Contents/MacOS`. All interactions with Secure Enclave are done
through tsh at the moment, so Connect doesn't need to do anything extra, other than skipping signing
of tsh.app during the build process (as we expect it to be already signed).

The path to a signed version of tsh.app should be provided through the `CONNECT_TSH_APP_PATH` env
variable.

#### Signing & notarizing

Signing & notarizing is required if the application is supposed to be ran on devices other than the
one that packaged it. See [electron-builder's docs](https://www.electron.build/code-signing) for a
general overview and [Teleport Connect build process](https://www.notion.so/goteleport/Teleport-Connect-build-process)
Notion page for Gravitational-specific nuances.

For the most part, the device that's doing the signing & notarizing needs to have access to an Apple
Developer ID (certificate + private key). electron-builder should automatically discover it if
Keychain is unlocked. The `CSC_NAME` env var can be additionally provided to point electron-builder
towards the specific developer ID certificate/key we want to use, if multiple are available.
`CSC_NAME` can either be SHA-1 of the certificate or its name.

On top of that, you must provide env vars that will be used for notarization. `APPLE_USERNAME` must
be set to the account email address associated with the developer ID. `APPLE_PASSWORD` must be [an
app-specific password](https://support.apple.com/en-us/HT204397), not the account password.

The Team ID needed as an input for notarization must be provided via the `TEAMID` environment
variable. The top-level `Makefile` exports this when `pnpm package-term` is called from `make
release-connect` with either the developer or production Team ID depending on the `ENVIRONMENT_NAME`
environment variable. See the top-level `darwin-signing.mk` for details.

## Architecture

### Resource lifecycle

The general approach is that a resource can become unavailable at any time due to a variety of
reasons: the resource going offline, the cluster going offline, the device running Connect going
offline, the cluster user losing access to the resource, just to name a few.

Connect must gracefully handle a resource becoming unavailable and make as few assumptions about
resource availability as possible.

### Diagram

```pro
                                                  +------------+
                                                  |            |
                                          +-------+---------+  |
                                          |                 |  |
                                          |    teleport     +--+
                                          |     clusters    |
                                          |                 |
                                          +------+-+--------+
                                                 ^ ^           External Network
+------------------------------------------------|-|--------------------------------------------------------------+
                                                 | |           Host OS
           Clients (psql)                        | |
              |                                  | |
              v                                  | |
     +--------+---------------+                  | |
     |                        |        SNI/ALPN  | | gRPC
  +--+----------------------+ |         routing  | |
  |                         | |                  | |
  |     local proxies       +-+                  | |
  |                         |                    | |
  +-------------------+-----+                    | |
                      ^                          | |
                      |                          | |
  +---------------+   | tls/tcp on localhost     | |
  |    local      |   |                          | |
  | user profile  |   |                          v v
  |   (files)     |   |                   +------+-+-------------------+        +-------------------------------+
  +-------^-------+   |                   |                            |        |                               |
          ^           +-------------------+         tsh daemon         |        |    Electron Shared Process    |
          |                               |          (golang)          |        |            (PTY)              |
          +<------------------------------+                            |        |                               |
                                          +-------------+--------------+        +-------------------------------+
 +--------+-----------------+                           ^                                       ^
 |         Terminal         |                           |                                       |
 |    Electron Main Process |                           |    gRPC API                           |   gRPC API
 +-----------+--------------+                           | (domain socket)                       |   (domain socket)
             ^                                          |                                       |
             |                                          |                                       |
    IPC      |                                          |        +------------------------------+
 named pipes |                                          |        |
             v  Terminal UI (Electron Renderer Process) |        |
 +-----------+------------+---------------------------------------------+
 | -gateways              | root@node1 × | k8s_c  × | rdp_win2 ×  |     |
 |   https://localhost:22 +---------------------------------------------+
 |   https://localhost:21 |                                             |
 +------------------------+ ./                                          |
 | -clusters              | ../                                         |
 |  -cluster1             | assets/                                     |
 |   +servers             | babel.config.js                             |
 |     node1              | build/                                      |
 |     node2              | src/                                        |
 |   -dbs                 |                                             |
 |    mysql+prod          |                                             |
 |    mysql+test          |                                             |
 |  +cluster2             |                                             |
 |  +cluster3             |                                             |
 +------------------------+---------------------------------------------+
```

### PTY communication overview (Renderer Process <=> Shared Process)

```mermaid
sequenceDiagram
    autonumber
    participant DT as Document Terminal
    participant PS as PTY Service
    participant PHS as PTY Host Service
    participant PP as PTY Process

    DT->>PS: wants new PTY
    Note over PS,PHS: gRPC communication
    PS->>PHS: createPtyProcess(options)
    PHS->>PP: new PtyProcess()
    PHS-->>PS: ptyId of the process is returned
    PS->>PHS: establishExchangeEvents(ptyId) channel
    Note right of DT: client has been created,<br/> so PTY Service can attach <br/> event handlers to the channel <br/>(onData/onOpen/onExit)
    PS-->>DT: pty process object
    DT->>PS: start()
    PS->>PHS: exchangeEvents.start()
    Note left of PP: exchangeEvents attaches event handlers<br/>to the PTY Process (onData/onOpen/onExit)
    PHS->>PP: start()
    PP-->>PHS: onOpen()
    PHS-->>PS: exchangeEvents.onOpen()
    PS-->>DT: onOpen()
    DT->>PS: dispose()
    PS->>PHS: end exchangeEvents channel
    PHS->>PP: dispose process and remove it

```

### Overview of a deep link launch process

The diagram below illustrates the process of launching a deep link,
depending on the state of the workspaces.
It assumes that the app is not running and that the deep link targets a workspace
different from the persisted one.

<details>
<summary>Diagram</summary>

```mermaid
flowchart TD
Start([Start]) --> IsPreviousWorkspaceConnected{Is the previously active workspace connected?}
IsPreviousWorkspaceConnected --> |Valid certificate| PreviousWorkspaceReopenDocuments{Has documents to reopen from the previous workspace?}
IsPreviousWorkspaceConnected --> |Expired certificate| CancelPreviousWorkspaceLogin[Cancel the login dialog]
IsPreviousWorkspaceConnected --> |No persisted workspace| SwitchWorkspace

    PreviousWorkspaceReopenDocuments --> |Yes| CancelPreviousWorkspaceDocumentsReopen[Cancel the reopen dialog without discarding documents]
    PreviousWorkspaceReopenDocuments --> |No| SwitchWorkspace[Switch to a deep link workspace]

    CancelPreviousWorkspaceDocumentsReopen --> SwitchWorkspace
    CancelPreviousWorkspaceLogin --> SwitchWorkspace

    SwitchWorkspace --> IsDeepLinkWorkspaceConnected{Is the deep link workspace connected?}
    IsDeepLinkWorkspaceConnected --> |Valid certificate| DeepLinkWorkspaceReopenDocuments{Has documents to reopen from the deep link workspace?}
    IsDeepLinkWorkspaceConnected --> |Not added| AddDeepLinkCluster[Add new cluster]
    IsDeepLinkWorkspaceConnected --> |Expired certificate| LogInToDeepLinkWorkspace[Log in to workspace]

    AddDeepLinkCluster --> AddDeepLinkClusterSuccess{Was the cluster added successfully?}
    AddDeepLinkClusterSuccess --> |Yes| LogInToDeepLinkWorkspace
    AddDeepLinkClusterSuccess --> |No| ReturnToPreviousWorkspace[Return to the previously active workspace and try to reopen its documents again]

    LogInToDeepLinkWorkspace --> IsLoginToDeepLinkWorkspaceSuccess{Was login successful?}
    IsLoginToDeepLinkWorkspaceSuccess --> |Yes| DeepLinkWorkspaceReopenDocuments
    IsLoginToDeepLinkWorkspaceSuccess --> |No| ReturnToPreviousWorkspace

    DeepLinkWorkspaceReopenDocuments --> |Yes| ReopenDeepLinkWorkspaceDocuments[Reopen documents]
    DeepLinkWorkspaceReopenDocuments --> |No| End

    ReopenDeepLinkWorkspaceDocuments --> End
    ReturnToPreviousWorkspace --> End
```

</details>
