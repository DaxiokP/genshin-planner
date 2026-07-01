#!/usr/bin/env python3
import os
import sys
import json
import asyncio

try:
    from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
    from google.antigravity.hooks import policy
except ImportError:
    print("❌ Error: google-antigravity SDK is not installed.")
    print("To install, ensure your Python environment matches the Antigravity setup.")
    sys.exit(1)

# Paths relative to script directory
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PATCH_CONFIG_PATH = os.path.join(BASE_DIR, 'src/maps/patchConfig.json')
PATCHES_PATH = os.path.join(BASE_DIR, 'src/maps/patches.json')

# =============================================================================
# 1. Custom Tools
# =============================================================================

def get_current_patch_version() -> str:
    """Reads the current patch version from the local patchConfig.json file.
    
    Returns:
        The current patch version string (e.g. "6.7").
    """
    if os.path.exists(PATCH_CONFIG_PATH):
        try:
            with open(PATCH_CONFIG_PATH, 'r') as f:
                data = json.load(f)
                return data.get("latestVersion", "6.6")
        except Exception as e:
            return f"Error reading config: {str(e)}"
    return "6.6"

def save_patch_version(version: str) -> str:
    """Saves the new patch version to the local patchConfig.json file.
    
    Args:
        version: The patch version string to save (e.g. "6.7").
    
    Returns:
        A confirmation message.
    """
    try:
        os.makedirs(os.path.dirname(PATCH_CONFIG_PATH), exist_ok=True)
        with open(PATCH_CONFIG_PATH, 'w') as f:
            json.dump({"latestVersion": version}, f, indent=2)
        return f"Successfully saved patch version {version} to patchConfig.json"
    except Exception as e:
        return f"Error saving version: {str(e)}"

def update_patches_file(patch_data_json: str) -> str:
    """Updates src/maps/patches.json with new character, weapon, artifact, and material details.
    
    Args:
        patch_data_json: The complete patch data JSON string.
        
    Returns:
        A confirmation message.
    """
    try:
        new_data = json.loads(patch_data_json)
        existing_data = {}
        if os.path.exists(PATCHES_PATH):
            with open(PATCHES_PATH, 'r') as f:
                existing_data = json.load(f)
        
        # Merge keys
        keys_to_merge = ["characters", "weapons", "artifacts", "materials", "characterRequirements", "weaponRequirements"]
        for key in keys_to_merge:
            if key not in existing_data:
                existing_data[key] = {}
            if key in new_data:
                existing_data[key].update(new_data[key])
                
        existing_data["version"] = new_data.get("version", existing_data.get("version", "6.7"))
        
        with open(PATCHES_PATH, 'w') as f:
            json.dump(existing_data, f, indent=2)
            
        return f"Successfully updated patches.json"
    except Exception as e:
        return f"Error updating patches.json: {str(e)}"

# =============================================================================
# 2. Main Agent Flow
# =============================================================================

SYSTEM_INSTRUCTIONS = """
You are the Genshin Impact Patch Update Agent for the Genshin Planner project.
Your goal is to autonomously update the project's game data when a new game version/patch is released.

When prompted to start:
1. Find the current patch version using 'get_current_patch_version'.
2. Search the web for information on the latest Genshin Impact patch updates (e.g. if current is 6.7, check if 6.7 or newer has released).
3. Identify any new:
   - Playable Characters (element, weapon type, rarity, level ascension materials, talent materials)
   - Weapons (rarity, type, substat type, base stats, ascension materials)
   - Artifact Sets (name, 2-piece effect, 4-piece effect, icon filenames)
   - Materials (Lunar Iron series or any other new ascension/drop items)
4. If a new version exists, build the JSON object matching the patches.json schema and call 'update_patches_file'.
   Format the requirements correctly following the exact keys used in materialMap.json.
5. Call 'save_patch_version' with the new version string.
6. Execute 'npm run update-data' and 'npm run build' in the workspace directory using the run_command tool to apply patches and verify that the project compiles cleanly.
7. Output a summary of the changes you made (characters, weapons, artifacts updated, and whether build succeeded).
"""

async def main():
    # Setup configuration
    config = LocalAgentConfig(
        model="gemini-3.5-flash",
        system_instructions=SYSTEM_INSTRUCTIONS,
        tools=[get_current_patch_version, save_patch_version, update_patches_file],
        capabilities=CapabilitiesConfig(),
        policies=[policy.allow_all()], # Allow run_command and file edits in local dev environment
        workspaces=[BASE_DIR]
    )

    print("🤖 Starting Genshin Planner Patch Agent...")
    async with Agent(config=config) as agent:
        prompt = "Start the update process. Check for the latest Genshin Impact patch and apply updates."
        print(f"\nUser Prompt: {prompt}\n")
        
        response = await agent.chat(prompt)
        async for chunk in response:
            print(chunk, end="", flush=True)
        print("\n\n🤖 Patch Agent completed turn.")

if __name__ == "__main__":
    asyncio.run(main())
