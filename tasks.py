import glob
import shutil
import platform
import os
from pathlib import Path

from invoke import task, Collection

PROJECT_HOME = os.path.dirname(__file__)
PROJECT_CODE = "podman-desktop-companion"
PROJECT_VERSION = Path(os.path.join(PROJECT_HOME, "VERSION")).read_text().strip()
NODE_ENV = os.environ.get("NODE_ENV", "development")
ENVIRONMENT = os.environ.get("ENVIRONMENT", NODE_ENV)
APP_PROJECT_VERSION = PROJECT_VERSION
TARGET = os.environ.get("TARGET", "linux")
PORT = 5000


def get_env():
    return {
        "BROWSER": "none",
        "PORT": str(PORT),
        "PROJECT_HOME": PROJECT_HOME,
        "PROJECT_CODE": PROJECT_CODE,
        "PROJECT_VERSION": PROJECT_VERSION,
        "NODE_ENV": NODE_ENV,
        "TARGET": TARGET,
        "PUBLIC_URL": ".",
        # "DEBUG": "electron-builder"
        # Global
        "ENVIRONMENT": ENVIRONMENT,
        "APP_PROJECT_VERSION": APP_PROJECT_VERSION,
    }


def run_env(ctx, cmd, env=None):
    cmd_env = {**get_env(), **({} if env is None else env)}
    nvm_dir = os.getenv("NVM_DIR", str(Path.home().joinpath(".nvm")))
    nvm_sh = os.path.join(nvm_dir, "nvm.sh")
    # print("ENVIRONMENT", cmd_env)
    if os.path.exists(nvm_sh):
        with ctx.prefix(f'source "{nvm_dir}/nvm.sh"'):
            nvm_rc = os.path.join(ctx.cwd, ".nvmrc")
            if os.path.exists(nvm_rc):
                with ctx.prefix("nvm use"):
                    ctx.run(cmd, env=cmd_env)
            else:
                ctx.run(cmd, env=cmd_env)
    else:
        ctx.run(cmd, env=cmd_env)



@task
def build(ctx, env=None):
    path = Path(PROJECT_HOME)
    with ctx.cd(path):
        shutil.rmtree("build", ignore_errors=True)
        run_env(ctx, "yarn build", env)
        for file in glob.glob("./src/resources/icons/appIcon.*"):
            shutil.copy(file, "./build")
        for file in glob.glob("./src/resources/icons/trayIcon.*"):
            shutil.copy(file, "./build")
        # shutil.copytree("build", "release")


@task
def bundle(ctx, env=None):
    system = platform.system()
    path = Path(PROJECT_HOME)
    with ctx.cd(path):
        if system == "Darwin":
            run_env(ctx, "yarn package:mac_x86", env)
            run_env(ctx, "yarn package:mac_arm", env)
        elif system == "Linux":
            run_env(ctx, "yarn package:linux_x86", env)
            # run_env(ctx, "yarn package:linux_arm", env)
        else:
            run_env(ctx, "yarn package:win_x86", env)


@task(default=True)
def help(ctx):
    ctx.run("invoke --list")


@task
def prepare(ctx, docs=False):
    # Install infrastructure dependencies
    with ctx.cd(PROJECT_HOME):
        run_env(ctx, "npm install -g yarn@latest concurrently@latest nodemon@latest rimraf@latest")
        run_env(ctx, "yarn install")



@task
def release(ctx, docs=False):
    env = {
        "NODE_ENV": "production",
        "ENVIRONMENT": "production",
    }
    build(ctx, env)
    bundle(ctx, env)


@task
def clean(c, docs=False):
    path = Path(PROJECT_HOME)
    with c.cd(os.path.dirname(path)):
        shutil.rmtree("node_modules", ignore_errors=True)
        shutil.rmtree("build", ignore_errors=True)
        shutil.rmtree("release", ignore_errors=True)



@task
def docs_start(c, docs=False):
    path = Path(os.path.join(PROJECT_HOME, "docs"))
    print("Starting docs server at http://0.0.0.0:8888")
    with c.cd(path):
        run_env(c, "python3 -m http.server --bind 0.0.0.0 8888 -d .")


@task
def app_start(ctx, docs=False):
    path = Path(PROJECT_HOME)
    with ctx.cd(path):
        run_env(ctx, "yarn dev")


@task
def start(ctx, docs=False):
    launcher = " ".join(
        [
            "concurrently",
            "-k",
            '"inv app-start"',
            '"inv docs-start"',
        ]
    )
    run_env(ctx, launcher)

namespace = Collection(clean, prepare, build, bundle, release, docs_start, app_start, start)
