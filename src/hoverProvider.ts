import * as vscode from 'vscode';

export class UnrealIRCdHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const lineText = document.lineAt(position).text;
        const wordRange = document.getWordRangeAtPosition(position, /(?<=^|\n)(\w+)/);
        const word = document.getText(wordRange);

        // Define documentation links for keywords
        const documentation: { [key: string]: string } = {
            "include": "https://www.unrealircd.org/docs/Include_directive",
            "loadmodule": "https://www.unrealircd.org/docs/Loadmodule_directive",
            "set": "https://www.unrealircd.org/docs/Set_directive",
            "oper": "https://www.unrealircd.org/docs/Oper_block",
            "ban": "https://www.unrealircd.org/docs/Ban_block",
            "allow": "https://www.unrealircd.org/docs/Allow_block",
            "me": "https://www.unrealircd.org/docs/Me_block",
            "class": "https://www.unrealircd.org/docs/Class_block",
            // Add more keywords and their documentation links here
        }

        if (documentation[word]) {
            const hoverText = new vscode.MarkdownString(showDocsForWord(word)+`\n\n[Open documentation in browser](${documentation[word]})`);
            return new vscode.Hover(hoverText);
        }

        return null;
    }
}

function showDocsForWord(word: string) {
    switch (word) {
        case "include":
            return `### Include directive
The include directive allows you to include other configuration files. This way you can split up your configuration instead of having one large unrealircd.conf.
### Syntax

    include "<file-name>";

    include "<url>";

### You can use:

- A relative file name, such as include "modules.default.conf"; this will be read from your conf directory in UnrealIRCd.
- A full path, such as include "/var/opt/whatever.conf"; or include "C:\\something\\xyz.conf";
- An URL using Remote includes, such as: include "https://user:password@www.example.net/restricted/opers.conf";

### Example

    include "modules.default.conf"; /* Load all modules */
    include "operclass.default.conf"; /* Default operclass blocks */
    include "spamfilter.conf"; /* Spamfilter configuration */
    include "badwords.conf";
    include "help.conf";
`;
        case "loadmodule":
            return `### Loadmodule directive
With loadmodule you tell UnrealIRCd to load a particular module. See [Modules](https://www.unrealircd.org/docs/Modules) for more information.

Normally you put include "modules.default.conf"; in your unrealircd.conf and only use loadmodule directly for loading 3rd party modules (if any).
### Syntax

    loadmodule <file-name>;

NOTE: UnrealIRCd automatically adds the correct suffix (.DLL or .so) and will also automatically deal with modules/ vs src/modules/ directories.
### Example

    /* Just load all of UnrealIRCd's functionality (all 150+ modules) */
    include "modules.default.conf";

    /* If you want to load modules\m_something.dll */
    loadmodule "m_something";

    /* If you want to load modules/whatever.so */
    loadmodule "whatever";

Note that for both examples UnrealIRCd will take care of any prefixing of the modules directory (modules/) and suffixing (.so or .dll).

    /* If you want to load modules/third/something.so */
    loadmodule "third/something";

### Disabling modules

To disable certain functionality that is automatically loaded by modules.default.conf you could manually edit that file and comment the modules out (or delete the lines). However, these changes are overwritten on each upgrade!

A better option is to use the [Blacklist-module](https://www.unrealircd.org/docs/Blacklist-module_directive) directive which allows you to disable specific modules (any loadmodule lines for the module are ignored). `;
            break;

        case "me":
            return `### Me block
The me block defines the identity of the server.

### Syntax:

    me {
        name <name-of-server>;
        info "<server-description>";
        sid <server-id>;
    }

The item name specifies the name of the server, info specifies the server's info line, sid is an unique server id which is a digit followed by two digits/letters in uppercase. This is an unique server value meaning NO other servers on the network may have the same SID.

### Example:

    me {
        name "irc.foonet.com";
        info "FooNet Server";
        sid 001;
    }
`;
            break;

        case "admin":
            return `### Admin block
The admin block defines the text displayed in a /admin request. You can specify as many lines as you want and they can contain whatever information you choose, but it is standard to include the admins nickname and email address at a minimum. Other information may include any other contact information you wish to give.

### Syntax:

    admin {
        <text-line>;
        <text-line>;
    }

### Example:

    admin {
        "Bob Smith";
        "bob";
        "widely@used.name";
    }
`;
            break;

        case "oper":
            return `### Oper block
In oper blocks you define all the IRC Operators accounts. Once defined you use the /OPER command on IRC to become IRCOp.

Recommended reading:
- [IRCOp guide](https://www.unrealircd.org/docs/IRCOp_guide) for any new IRCOps
- [Special users](https://www.unrealircd.org/docs/Special_users) for defining users with extra privileges that are NOT IRCOps

### Syntax:
    oper <name> {
            /* Required items: */
            mask <hostmask>;
            class <class-name>;
            operclass <operclass-name>;
            /* Optional items to further limit who can /OPER */
            password <password>;
            auto-login <yes|no>;
            require-modes <modes>
            maxlogins <num>;
            /* Optional items to define what will be set upon successful /OPER */
            vhost <new virtual hostname>;
            swhois <whois info>;
            modes <modes>;
            snomask <snomask>;
            server-notice-colors yes|no;
            server-notice-show-event yes|no;
    }

    `;
            break;
        case "class":
            return `### Class block
Class blocks are classes in which connections will be placed, for example clients from allow blocks and servers from link blocks. You generally have multiple class blocks: one for servers, one for regular clients and one for IRCOps (the latter is optional).
### Syntax

    class <name> {
        pingfreq <ping-frequency>;
        connfreq <connect-frequency>;
        maxclients <maximum-clients>;
        sendq <send-queue>;
        recvq <recv-queue>;
        //options { nofakelag; }
    }

'''name''' is the descriptive name, like "clients" or "servers", this name is used for referring to this class from allow/link/oper/etc blocks

'''pingfreq''' is the number of seconds between PINGs from the server (something between 90 and 180 is recommended).

'''connfreq''' is used only for servers and is the number of seconds between connection attempts if autoconnect is enabled

'''maxclients''' specifies the maximum (total) number of clients/servers which can be in this class

'''sendq''' specifies the amount of data which can be in the send queue (very high for servers with low bandwidth, medium for clients)

'''recvq''' specifies the amount of data which can be in the receive queue and is used for flood control (this only applies to normal users, try experimenting with values 3000-8000, 8000 is the default).

'''options::nofakelag''' allows this particular class to bypass the fake lag protection, it is almost never used. Read the FAQ on fake lag first before you try using this!
### Examples

    class clients
    {
        pingfreq 90;
        maxclients 1000;
        sendq 200k;
        recvq 8000;
    }

    class servers
    {
        pingfreq 60;
        connfreq 15;     /* try to connect every 15 seconds */
        maxclients 10;   /* max servers */
        sendq 20M;
    }

    class opers
    {
        pingfreq 90;
        maxclients 50;
        sendq 1M;
        recvq 8000;
    }`;
            break;

        case "allow":
            return `### Allow block
Allow blocks specify who may connect to this server and what class to put the user in. You can have multiple allow blocks. 

### Syntax
    allow {
            mask <mask>;
            class <connection-class>;
            maxperip <max-connections-per-ip-locally>;

            /* All the rest is optional: */
            global-maxperip <max-connections-per-ip-globally>;
            password <connection-password> { <auth-type>; } /* OPTIONAL */
            redirect-server <server-to-forward-to>; /* OPTIONAL */
            redirect-port <port-to-forward-to>; /* OPTIONAL */
            options {
                <option>;
                <option>;
                ...
            }
    }
            
Do you have multiple allow blocks? Then note that they will be read upside down, so you need specific host/ip allow blocks AFTER your general *@* allow blocks.

If a client does not match any allow block then the client is rejected with the message from set::reject-message.
### required items
'''mask'''

You must specify a mask such as mask *;. Advanced users may wish to look at Mask item to see a lot more options that can be used for masks, such as lists, negative matching, matching SASL users, certificate fingerprints, etc.

'''class'''

Specifies the class name that connections using this allow block will be placed into.

'''maxperip'''

With maxperip you specify how many local connections may come from each IP. For example maxperip 4; means that only 4 clients may connect per-IP to this server.

Note that if you use Services then it may have a session limit too. If you bump maxperip in UnrealIRCd and then see kills/quits with the reason "Session limit exceeded" then you know it is not UnrealIRCd doing this but anope or other services. We recommend disabling the os_session module in your services since it is unneeded with UnrealIRCd.

'''global-maxperip'''

This specifies the global maximum number of connections from each IP (network-wide). If you don't have this, then it will default to maxperip+1.
### optional items
- password

The server password or another authentication method that the user authenticates with.

There are two possible behaviors for password control:
optional password to get extra rights

The default behavior is, if the password is incorrect, to continue matching next allow block:

    allow { mask *; class clients; maxperip 2; }
    allow { mask *; password "iwantmore"; class clients; maxperip 10; }

If a user connects with the password iwantmore then they will get a maxperip of 10. If the user does not connect with that password (either wrong or no password) then the user will get a maxperip of 2.
mandatory password

On the other hand, you may want to use passwords to keep other users out. In this case you need to use allow::options::reject-on-auth-failure as described below:

    allow { mask *; class clients; maxperip 2; }
    allow { mask *@*.nl; password "tehdutch"; class clients; maxperip 2; options { reject-on-auth-failure; } }

In this case anyone with a hostname of *.nl must provide the password tehdutch. If they don't, they will be rejected access and cannot connect to the server.
### redirect-server & redirect-port

When the class is full (class::maxclients) we will redirect new users to this server. This requires support from the IRC client side, popular clients like mIRC support this but this feature is broken in case of SSL/TLS so is likely of little use in the modern world.

redirect-server specifies the server name and redirect-port the port (6667 by default).
options

One option gives you additional flexibility for matching:

- tls: Only match if this client is connected via SSL/TLS.

Meaning, if this doesn't match, UnrealIRCd jumps to next allow block.

There are also two other options that don't have anything to do with matching but will affect the user/host:

- useip: Always display IP instead of hostname.
- noident: Don't use ident but use username specified by client.

And, finally, there's one special option that is rarely used:

- reject-on-auth-failure: Reject the user if the password is not provided or does not match. See also the password option above for a longer explanation.`;

    
    }
}