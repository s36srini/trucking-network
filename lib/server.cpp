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
    
void millisleep(unsigned milliseconds)
{
	usleep(milliseconds * 1000); // takes microseconds
}

void signal_callback_handler(int signum) {
   printf("Caught signal %s\n", &(std::to_string(signum))[0]);
   close(sockfd);
   // Terminate program
   exit(signum);
}

int main()
{
	struct sockaddr_in servaddr = {0};

	std::string hello = "hello from server";
    char *p = &hello[0];
	
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
	
	socklen_t len = 0;

	while(true) {
		int len = sendto(sockfd, (const char *)p, strlen(p),
		0, (const struct sockaddr *)&servaddr, sizeof(servaddr));
		if(len ==-1)
		{
			perror("failed to send");
		}
		std::cout << "sending" << std::endl;
		millisleep(1000);
	}

	close(sockfd);
    return 0;
}