# MCBE Prison Mines Addon

Easily create and manage prison-style mines for your MCBE worlds, realms, servers, etc... You can create mines as large as you like with whatever blocks you like. You can also control automatic refilling based on percentages and timers.

# How To Use:

First, download the `.mcpack` file (see below) and install it.

After installing the pack, open Minecraft and apply it to your desired world(s).

Once you've done that and you've gone into your world, you're almost done. To access the UI, run the following command: `/tag @s add mines-ui`. (This UI is how you interact with everything)

You should see two buttons, the first one is pretty straight forward. After you've created a mine, you will see an additional button on this page. Go ahead and create a mine.

Click on the button to manage your new mine (you can create as many mines as you like and you can repeat this process with each new mine). Currently, this mine doesn't have any blocks in it, click on `Edit Blocks`.

Let's add a block, click on `Add Block`. The first field asks for a `Block ID`, this can be any block; for this example, type `minecraft:wool`.

The `Block Weight` is the percentage (out of 100%) of the mine that will be made up of this block.

The `Permutation Key` can be left as `undefined` if you'd like, however changing it gives us a lot more control. Change it to `color`.

The `Permutation Value` is where we can define what color (or other permutation) we'd like our block to be. Type `red` and click `Submit`.

You can add other blocks if you'd like, but after you've added your blocks click `Go Back`.

Teleport to your mine by clicking `Teleport to Mine`.

Open the UI again and navigate back to this mine's menu. (`/tag @s add mines-ui`)

Click `Refill Mine`.

Let's go over the `Mine Settings`:

- Mine Refill Timer: Seconds between automatic refills of the mines, set to `-1` to disable this.
- Auto-Refill Percentage: Once this percent of the mine is left, it will automatically refill. Set to `-1` to disable.
- Teleport Coordinates: This is where the `Teleport to Mine` button teleports you to. Additionally, if a player is inside of the mine when it refills, they will be teleported here.

In the main menu, there is a button called `Global Settings`, click it.

Let's go over these settings:

- Mine Refill Stalling: For efficency, this addon slowly refills mines. You can set the speed that you'd like mines to refill at, however higher values may cause lag. 

# IMPORTANT:
This addon makes use of the GameTest framework to run.

Beta APIs are being used! Please make sure to enable this setting on your world in order for this addon to run.

# Downloads:
`.mcpack`: https://www.mediafire.com/file/gpqf00s19qdka3l/MCBE_Prison_Mines_%2528GameTest%2529.mcpack/file
