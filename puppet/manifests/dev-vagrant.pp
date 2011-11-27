#
# Puppet manifest to bootstrap a dev box under Vagrant
#

#import "classes/*.pp"

$PROJ_DIR = "/vagrant"

#import "dev-vagrant-settings.pp"

class vagrant_hacks {
}

class repos {
}

class dev_tools {
    package { 
        [ "build-essential", "openssl", "libssl-dev", 
            "libxml2", "libxml2-dev", "libxslt1.1", "libxslt1-dev", 
            "curl", "git-core", "mercurial", "subversion", "subversion-tools",
            "vim-nox", "vim-puppet", "vim-scripts",
            "asciidoc", "xsltproc", "source-highlight", "fop",
            "python-software-properties", "python-pip", "python-virtualenv",
            "libicu-dev", "libcurl4-gnutls-dev", "libtool",

            "rabbitmq-server",
        ]:
        ensure => latest;
    }
    package {
        [ "git-scribe" ]:
            ensure => latest, provider => gem, require => [ 
                Package["libxml2-dev"], Package["libxslt1-dev"] ];
    }
}

# Kindlegen, for making mobi's
# See also: http://www.amazon.com/gp/feature.html?ie=UTF8&docId=1000234621
# Terms of use: http://www.amazon.com/gp/feature.html?docId=1000599251
class kindlegen {
    exec { "kindlegen_download":
        cwd => "/vagrant/puppet/cache",
        command => "/usr/bin/wget http://s3.amazonaws.com/kindlegen/kindlegen_linux_2.6_i386_v1.2.tar.gz",
        creates => "/vagrant/puppet/cache/kindlegen_linux_2.6_i386_v1.2.tar.gz"
    }
    file { "/opt/kindlegen":
        require => Exec["kindlegen_download"],
        ensure => directory,
        owner => "vagrant", group => "vagrant", mode => 0777;
    }
    exec { "kindlegen_extract":
        require => File["/opt/kindlegen"],
        cwd => "/opt/kindlegen",
        command => "/bin/tar -zxf /vagrant/puppet/cache/kindlegen_linux_2.6_i386_v1.2.tar.gz",
        creates => "/opt/kindlegen/kindlegen"
    }
    file { "/usr/local/bin/kindlegen":
        require => Exec["kindlegen_extract"],
        target => "/opt/kindlegen/kindlegen",
        ensure => link
    }
}

# Couch 1.1.0, installed from an unofficial source
# see: https://launchpad.net/~ericdrex/+archive/couchdb
class couchdb {
    exec { "couchdb_ppa":
        command => "/usr/bin/add-apt-repository ppa:ericdrex/couchdb && /usr/bin/apt-get update",
        creates => "/etc/apt/sources.list.d/ericdrex-couchdb-natty.list",
        require => Package["python-software-properties"],
    }
    package { "couchdb": 
        ensure => latest,
        require => Exec["couchdb_ppa"],
    }
    exec { "couchdb_bind_address":
        command => "/bin/sed -i 's|;bind_address = 127.0.0.1|bind_address = 0.0.0.0|g' /etc/couchdb/local.ini",
        unless  => "/bin/grep 'bind_address = 0.0.0.0' /etc/couchdb/local.ini",
        require => Package["couchdb"]
    }
    service { "couchdb":
        ensure    => running,
        enable    => true,
        require   => Package['couchdb'],
        subscribe => [
            Exec["couchdb_bind_address"]
        ]
    }
}

class python_packages {
    exec { "pip-install-requirements":
        cwd => '/tmp', 
        timeout => 3600, # Too long, but this can take awhile
        command => "/usr/bin/pip install -r $PROJ_DIR/code/pip-requirements.txt";
    }
}

# Dev machine setup
class dev {
    class {
        vagrant_hacks:;
        repos: require => Class[vagrant_hacks];
        dev_tools: require => Class[repos];
        kindlegen: require => Class[dev_tools];
        couchdb: require => Class[dev_tools];
        python_packages: require => Class[dev_tools];
    }
}

include dev
