#include <stdio.h> 
#include <stdlib.h> 
#include <unistd.h> 
#include <string.h> 
#include <sys/types.h> 
#include <sys/socket.h> 
#include <arpa/inet.h> 
#include <netinet/in.h>

#include <signal.h>
#include <string>  
#include <iostream>

int sockfd;

void signal_callback_handler(int signum) {
   printf("Caught signal %s\n", &(std::to_string(signum))[0]);
   close(sockfd);
   // Terminate program
   exit(signum);
}

int main()
{
    char buffer[50] = {0};
	struct sockaddr_in servaddr = {0};
	
	sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
	if(sockfd == -1)
	{
		perror("failed to create socket");
		exit(EXIT_FAILURE);
	}

    signal(SIGINT, signal_callback_handler);
	
	servaddr.sin_family = AF_UNIX;
	servaddr.sin_port = htons(12345);
	servaddr.sin_addr.s_addr = INADDR_ANY;

    int rc = bind(sockfd, (const struct sockaddr *)&servaddr, 
		sizeof(servaddr));
		
	if(rc == -1)
	{
		perror("failed to bind");
		close(sockfd);
		exit(EXIT_FAILURE);
	}
	
    while(true) {
        int n = recv(sockfd, (char *)buffer, 50, MSG_WAITALL);
        buffer[n] = '\n';
        printf("%s", buffer);
    }
	
	close(sockfd);
	
    return 0;
}